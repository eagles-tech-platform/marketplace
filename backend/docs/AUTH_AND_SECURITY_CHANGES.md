# Auth + security merge notes

## Authentication (finished migration)
- Access token (15 min, HS256, keyring `kid`) is sent as `Authorization: Bearer` and kept in memory only.
- Refresh token is an opaque 64-byte value in an HttpOnly cookie (`path=/api/auth`), stored only as an HMAC hash, rotated on every use.
- Routes: `POST /auth/refresh`, `/auth/logout`, `/auth/logout-all`; `GET /auth/sessions`; `DELETE /auth/sessions/:id`.
- Password change / reset revokes every refresh session (change-password keeps the current device signed in).
- Reuse of an old refresh token revokes the whole device family; two tabs refreshing simultaneously get a 409 `REFRESH_RACE` and retry instead.
- Fixed: `verifyAccessToken` used a key-lookup function in sync mode, which `jsonwebtoken` rejects (every request would 401).
- Fixed: 2FA login, logout and the sessions endpoints still used the removed cookie/`Session` system.
- Socket.IO authenticates with the access token (`auth: { token }`), re-checks it on every event, and accepts `update_token` so rotation does not drop the connection.
- Removed: `models/Session.js`, `utils/generateToken.js`. Unused env vars: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_NAME`.

## From the pentest packages
Payments (exact amount/currency/reference verification, duplicate-payment guard, withdrawal caps), recurring Paystack subscriptions
(`workers/subscriptionWorker.js`), upload signature checks, chat limits, `csrfOrigin` middleware. See `PENTEST_REMEDIATION.md`
and `RECURRING_PAYMENTS_IMPLEMENTATION.md`.

## Dashboard counts
Customers / providers / admins are now mutually exclusive buckets (admin dashboard and `/api/meta/stats`), so they sum to the real user total.

## Deploy checklist
1. Set every variable in `.env.example` (generate secrets with the two scripts). 
2. `COOKIE_SAME_SITE=none` + `NODE_ENV=production` when frontend and API are on different domains.
3. `CLIENT_URL` must list every frontend origin, including `https://localhost` for the Capacitor Android app.
4. Rotate any credential that was ever stored in a committed/shared `.env`.
5. Run `npm run subscriptions:migrate` once, and the worker as a separate process only when `PAYMENTS_MODE=live`.
