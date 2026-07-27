# WORK IN PROGRESS — MARKET PLACE

Last updated: session 21 — homepage hardcoded content removed.

## ✅ FINISHED this session

- **Homepage testimonials** — were 3 fully invented customer quotes since
  the original build. New public `GET /api/reviews/featured` (real
  reviews, rating ≥4, with actual comments) replaces them. Shows a
  genuine empty state ("No reviews yet — be the first") instead of fake
  quotes when there aren't any yet.
- **Homepage blog posts** — were 3 invented articles that don't exist
  anywhere in the database. Now pulls real approved posts via the
  existing `postApi.list()`. Dropped the "category" badge since posts
  don't have a category field, rather than fake one.

Both sides verified clean: backend syntax-checked, frontend passes
`tsc --noEmit` and `npm run build` with zero errors.

## What's left overall (unchanged)
1. Live payment testing — needs real keys + deployed backend URL.
2. Live recurring billing for subscriptions (simulate mode only).
3. S3 for production uploads — code done, `backend/S3_SETUP.md`.
4. Deployment itself (backend to Render/Railway, frontend to Netlify).

## Security note (unchanged)
`backend/.env.example` has your real MongoDB Atlas password. **Never
commit `.env` to a public GitHub repo.**
