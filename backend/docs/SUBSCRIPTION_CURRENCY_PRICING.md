# Subscription currency pricing

Subscription amounts are configured on the backend, never supplied by the browser.

## Environment variables

Set all 12 `SUBSCRIPTION_*` values from `backend/.env.subscription-pricing` in the backend `.env` for local development and in Render's backend environment for production. Production startup requests will fail closed with a configuration error if any plan/currency/interval price is missing or invalid.

The API `GET /api/subscriptions/plans` now returns both currency sets for every plan:

```json
{
  "currency": "NGN",
  "plans": [
    {
      "tier": "basic",
      "prices": {
        "NGN": { "monthly": 1500, "quarterly": 4500, "annual": 15000 },
        "USD": { "monthly": 3, "quarterly": 9, "annual": 30 }
      }
    }
  ]
}
```

`currency` remains location-derived: Nigerian states use NGN; other locations use USD. The Pricing page reads `prices[currency][interval]`. The subscribe endpoint independently derives currency and amount from the authenticated user's saved state and backend environment values, so a modified frontend request cannot select a different amount or currency.

Each initial subscription payment is persisted in the existing `Payment` collection with `amount`, `currency`, gateway/provider, reference, purpose and status. Existing history and verification use those persisted values.

## Current defaults

| Plan | Currency | Monthly | Quarterly | Annual |
|---|---|---:|---:|---:|
| Basic | NGN | 1,500 | 4,500 | 15,000 |
| Basic | USD | 3 | 9 | 30 |
| Pro | NGN | 4,000 | 12,000 | 40,000 |
| Pro | USD | 8 | 24 | 80 |

Update the environment variables to change these prices. Do not edit the frontend to change subscription amounts.
