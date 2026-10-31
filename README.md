# MARKET PLACE

A three-way services marketplace (Admin / Customers / Providers) for Nigerian
and international job niches — restructured into two independent services.

```
/frontend   React + TypeScript + Vite + Tailwind (the UI)
/backend    Express + MongoDB (Mongoose) — the API
```

See **WORK_IN_PROGRESS.md** for what's done, what's fixed, what's still
outstanding, and the decisions still needed from you before the next session.

## Running it locally

### 1. Backend

```bash
cd backend
cp .env.example .env
# then edit .env: add real SMTP credentials so verification/2FA emails send,
# and set a strong JWT_SECRET. The MongoDB URI you gave me is already filled in.
npm install
npm run seed     # populates the Category collection from the 16 job categories
npm run dev       # http://localhost:5001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # points VITE_API_BASE_URL at the backend above
npm install
npm run dev       # http://localhost:5173
```

Sign up, then check the email inbox you registered with for the verification
link (requires SMTP to be configured in backend/.env — see WORK_IN_PROGRESS.md
if you don't have an SMTP provider yet).
