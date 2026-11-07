# Marketplace recurring payments implementation

This package extends the existing Express + Mongoose payment system. Existing one-time booking, provider-slot, recommendation, verification-badge, payout and webhook flows remain in place. Do not replace `controllers/paymentController.js` or the existing gateway service integrations with a new payment stack.

## Implemented architecture

- **Paystack:** first customer-authenticated checkout is a normal Paystack transaction. When its verified response returns `authorization.reusable === true`, the authorization code is encrypted at rest with AES-256-GCM. A dedicated Render Background Worker charges that authorization on monthly, quarterly or annual due dates using Paystack's `transaction/charge_authorization` endpoint. The worker has a MongoDB lease lock, unique references, a pending-charge reconciliation check, bounded retries and an uncertainty guard so a network timeout does not immediately cause a second debit.
- **Flutterwave:** creates a Flutterwave Payment Plan for the selected plan/currency/interval and passes its `payment_plan` ID to the first Standard Checkout transaction. Flutterwave owns subsequent automatic card charges. Webhooks are HMAC-verified, transaction IDs are re-verified through Flutterwave, and each renewal is checked against exact reference, amount and currency before membership is extended.
- **Audience:** a user may hold one customer subscription and one provider subscription. Provider membership requires `canBeProvider`; customer membership requires `canBeCustomer`. For Flutterwave specifically, this build prevents a second concurrent Flutterwave membership for the same account across audiences because Flutterwave renewal webhooks may not consistently include a unique subscription identifier; use Paystack for a second concurrent membership until that gateway webhook identity is confirmed.
- **Intervals:** monthly, quarterly and annual. Paystack interval cadence is handled by the worker; Flutterwave uses `monthly`, `quarterly`, and `yearly` provider plan intervals.
- **History:** initial and renewal transactions are recorded in the existing `Payment` collection with subscription-specific purposes.
- **Notifications:** in-app notifications are written for activation, renewal, failed charges, retry exhaustion and cancellation.
- **Admin:** `GET /api/subscriptions/admin/all` lists subscriptions with optional `status`, `gateway` and `audience` filters. It is protected by the existing admin role middleware.

## Important gateway differences / cancellation limitation

Paystack's recurring-charge API is an authorization-token charge initiated by your server, so Marketplace can stop future Paystack charges by disabling `autoRenew` locally. Paystack says reusable authorizations can be charged by the merchant at chosen intervals. Paystack's native Subscriptions API does not retry failed subscription charges, which is why the Marketplace worker implements bounded retries for this Paystack flow.

Flutterwave's current Payment Plans documentation says Flutterwave manages subsequent billing and retries failed charges three additional times at 30-minute intervals. It documents cancellation through the customer's cancellation link in Flutterwave reminder emails, the merchant dashboard, or a cancel-subscription endpoint, but the current public v3 documentation surfaced for this implementation did not provide a verifiable individual-subscription cancellation request schema. **For safety, this build does not call an undocumented endpoint or cancel a shared payment plan**, because cancelling a shared plan can affect every subscriber. The customer cancellation API therefore returns HTTP 409 with instructions for using the Flutterwave reminder cancellation link or Marketplace support to cancel that specific subscription in the Flutterwave dashboard. The `subscription.cancelled` webhook then updates Marketplace access state. Before enabling Flutterwave for production subscriptions, test and document the individual cancellation endpoint available to your specific Flutterwave account/version, then add it to `services/flutterwave.js`.

This is an intentional safety limitation, not a claim that Flutterwave cannot cancel subscriptions.

## API endpoints

All endpoints are mounted under `/api`:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/subscriptions/plans` | Public | Plans, prices and intervals |
| GET | `/subscriptions/founding-status` | Public | Existing founding-member counter |
| GET | `/subscriptions/mine` | User | Customer/provider subscriptions |
| GET | `/subscriptions/history` | User | Subscription payment history |
| POST | `/subscriptions/subscribe` | User | Start checkout |
| GET | `/subscriptions/verify/:reference` | User | Verify gateway callback |
| POST | `/subscriptions/:id/cancel` | User | Stop renewal where gateway behavior is supported |
| POST | `/subscriptions/:id/retry` | User | Queue a Paystack retry for a past-due subscription |
| GET | `/subscriptions/admin/all` | Admin | Subscription management list |

### Subscribe request

```json
{
  "planId": "MONGODB_PLAN_ID",
  "interval": "monthly",
  "gateway": "paystack",
  "audience": "provider",
  "consent": true
}
```

`interval` is one of `monthly`, `quarterly`, `annual`; `gateway` is `paystack` or `flutterwave`; `audience` is `customer` or `provider`. The server derives the amount and currency from the stored plan and the authenticated user's state. `consent: true` is mandatory and the server records consent version, timestamp, request IP and user-agent. Never accept an amount or consent timestamp from the browser.

A successful response contains `checkoutUrl`, `reference`, `subscriptionId`, `gateway`, `currency`, `amount`, `interval`, and `audience`. Redirect the browser to `checkoutUrl`.

## Required one-time MongoDB migration

**Back up MongoDB before running this migration.** The old `Subscription` schema had a unique index on `user`. The new schema uses a unique compound index on `{ user, audience }` so a user can hold separate customer and provider memberships.

From the backend directory, run once:

```powershell
npm run subscriptions:migrate
```

The script backfills missing `audience` values as `customer`, drops only the legacy unique `user` index, and creates the compound unique index. Run it against the intended MongoDB database before deploying the new code. Do not run it against an unintended database.

## Required environment variables in Render

Keep existing environment variables. Add or verify:

```env
PAYMENTS_MODE=live
CLIENT_URL=https://marketplace-omega-virid.vercel.app
PAYMENT_CALLBACK_BASE_URL=https://marketplace-omega-virid.vercel.app
PAYSTACK_SECRET_KEY=<Paystack secret key>
FLUTTERWAVE_SECRET_KEY=<Flutterwave secret key>
FLW_SECRET_HASH=<Flutterwave webhook secret hash>
SUBSCRIPTION_TOKEN_ENCRYPTION_KEY=<32-byte base64 key>
SUBSCRIPTION_WORKER_POLL_MS=60000
PAYSTACK_RECURRING_CURRENCIES=NGN
```

Generate the encryption key locally:

```powershell
npm run subscriptions:keygen
```

Copy its output directly into Render as `SUBSCRIPTION_TOKEN_ENCRYPTION_KEY`. Never commit it, place it in Vite variables, expose it to the browser, or paste it into chat. Keep it stable: changing it without re-encrypting saved authorizations makes existing Paystack payment methods unreadable. Store a protected backup in your secret manager.

`PAYSTACK_RECURRING_CURRENCIES` is an explicit allow-list. Start with `NGN`; add another currency only after confirming that your Paystack merchant account supports recurring charges for it. Flutterwave plan currency must match the checkout transaction currency.

## Render deployment

Deploy two Render services from the same backend repository and commit:

1. **Web Service**: build command `npm install`; start command `npm start`.
2. **Background Worker**: build command `npm install`; start command `npm run subscriptions:worker`.

Give both services the same MongoDB and gateway environment variables. The worker must have `PAYMENTS_MODE=live`, `MONGO_URI`, `PAYSTACK_SECRET_KEY`, and `SUBSCRIPTION_TOKEN_ENCRYPTION_KEY`. Do not run the worker as a second web service and do not put it in the Vercel frontend. MongoDB lease locks protect against duplicate worker instances, but a single Render worker is the recommended initial deployment.

The worker intentionally refuses to start unless `PAYMENTS_MODE=live`. Test with gateway test credentials and a staging MongoDB database first.

## Gateway webhook configuration

Configure these HTTPS endpoints in each gateway dashboard:

- Paystack: `https://marketplace-0399.onrender.com/api/payments/webhook/paystack`
- Flutterwave: `https://marketplace-0399.onrender.com/api/payments/webhook/flutterwave`

For Flutterwave, configure the webhook secret hash in the dashboard and set the same value as `FLW_SECRET_HASH`. The implementation supports the current `flutterwave-signature` HMAC-SHA256 base64 header and legacy `verif-hash` equality for older accounts. Enable webhook retries in the Flutterwave dashboard. The server captures raw JSON bytes before parsing so signature verification is performed on the exact body.

Paystack webhook signature verification continues to use HMAC-SHA512 over the raw body with `PAYSTACK_SECRET_KEY`.

## Frontend integration

The ZIP supplied for this work contains the backend only, not the Marketplace Vite/React frontend. Two integration examples are in `frontend-integration/`:

- `MarketplaceSubscriptions.jsx`: plan selection, customer/provider audience, gateway, interval, current subscription, cancel/retry actions and payment history.
- `SubscriptionCallback.jsx`: callback verification for Paystack and Flutterwave.

Adapt these examples to your existing frontend API client and route conventions. The examples expect an `api(path, { method, body })` function that includes credentials/cookies and returns parsed JSON. Register `/subscription/callback` in React Router. Do not put gateway secret keys or the authorization encryption key in Vercel environment variables prefixed with `VITE_`.

## Security and operational notes

- The server calculates all prices from MongoDB plans; clients cannot choose an amount.
- Webhook payloads are triggers only. Successful charges are verified directly with the gateway and must match expected reference, exact amount and currency.
- Payment references are unique; settlement uses an atomic `pending -> success` claim to make duplicate webhook delivery idempotent.
- Paystack authorization codes are AES-256-GCM encrypted at rest and selected out of ordinary Mongoose queries.
- Do not log authorization codes, full webhook payloads, gateway secrets, card data or tokens.
- Never store PAN, CVV, PIN or OTP. Gateway-hosted checkout handles sensitive card entry.
- Provide clear consent at checkout: amount, currency, billing interval, first charge date, automatic renewal, cancellation path and failed-payment handling.
- The initial Paystack charge must return `authorization.reusable === true` for automatic renewal. If it does not, the first paid period is activated but automatic renewal is disabled and the customer is notified.
- The Paystack worker has up to three retries at 1, 3 and 5 days after the initial failed attempt, then expires the subscription. A charge with an uncertain network outcome is reconciled before another debit is attempted.
- Flutterwave handles three retry attempts at 30-minute intervals. Marketplace marks failed renewal attempts as `past_due` and restores active status only after a verified successful renewal.
- Cancellation does not refund an already-paid period. Paystack access remains until the period end after cancellation.
- Existing one-time payments remain routed through `/api/payments/initialize` and existing settlement handlers.

## Production rollout checklist

1. Back up the MongoDB database.
2. Run `npm run subscriptions:migrate` against the production database.
3. Deploy backend web service with new env variables.
4. Deploy Render Background Worker and confirm startup log.
5. Configure Paystack and Flutterwave webhooks; test signature rejection with a deliberately invalid signature.
6. Use gateway test-mode credentials in staging to test initial checkout, webhook duplicate delivery, renewal success, renewal failure, retry exhaustion and cancellation.
7. Confirm exact amount/currency mismatches never activate or extend a subscription.
8. Confirm Paystack `reusable:false` results do not enable auto-renewal.
9. Confirm the worker does not charge when `autoRenew=false`, status is cancelled/expired, or a previous renewal is unresolved.
10. Confirm Flutterwave customer cancellation through the gateway dashboard/reminder link and verify the cancellation webhook arrives.
11. Deploy the React components adapted to the actual frontend API client.
12. Only then enable live recurring checkout for customers.


## Follow-up security and chat hardening (2026-11-04)

- Socket.IO now uses the same JWT and MongoDB Session validation as REST, checks session revocation for each client event, restricts origins, validates room membership before join/send/typing/read events, and supports acknowledgements.
- Password change and password reset revoke all active sessions; users must sign in again. `REQUIRE_JTI=true` enforces session-backed JWTs.
- State-changing browser API requests are checked against `CLIENT_URL` Origin values to mitigate CSRF while production cookies use `SameSite=None` for the Vercel-to-Render cross-site setup. Gateway webhooks remain protected by their HMAC signatures.
- One-time payment settlement now requires exact reference, exact amount in minor units and an explicit matching currency from the gateway; missing currency is rejected.
- Uploads are checked against file magic bytes instead of trusting the browser-provided MIME type.
- `GET /api/subscriptions/capabilities` reports live/simulate mode and configured gateway capabilities for the subscription UI. The React site must consume this endpoint rather than display a hard-coded simulate-mode warning.

**Frontend limitation:** the source archive supplied for this update contains the backend only. It does not include the React subscription page or chat client. The API/socket backend is hardened here, but the existing Vercel UI still needs its actual frontend source to remove the stale warning and ensure its Socket.IO client connects with `withCredentials: true`, listens for `new_message`, and acknowledges sends.
