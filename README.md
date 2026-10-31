# Help Center and Contact system for Quantum MarketPlace

## What you get
- **Help Center**: searchable guides in 5 categories, article pages, "was this helpful?" feedback, related articles.
- **Contact form**: validated, spam-protected, creates a ticket with an ID like QM-1A2B3C4D, emails you and the customer.
- **Ticket tracking**: customers check status and reply using ticket ID + email (no account needed).
- **Admin inbox**: filter, search, read, reply (emails the customer) and change status. Article management API included.

Assumes: Node.js + Express (ES modules) + MongoDB/Mongoose on the backend; React Router 7, TypeScript, Tailwind and lucide-react on the frontend.

## 1. Backend
1. Copy `backend/src/support/` into your backend's `src/`.
2. Install what's missing: `npm i zod nodemailer express-rate-limit` (you likely already have express, mongoose, dotenv).
3. Wire it into your server file, after `express.json()`:
```js
import { mountSupport } from "./support/index.js";

app.set("trust proxy", 1); // needed on Render/Railway/etc. so rate limits see real visitor IPs
app.use(express.json({ limit: "20kb" }));
// ... your cors() setup: allow your Vercel domain (and https://localhost for the Android app)

mountSupport(app, { requireAdmin }); // requireAdmin = your existing "admins only" middleware
```
4. Copy the lines from `backend/.env.example` into your backend `.env` and your host's environment settings.
5. Add starter articles (safe to re-run): `node src/support/seed.js`

If your backend uses `require()` instead of `import`, or SQL instead of MongoDB, tell me and I'll convert it.

## 2. Frontend
1. Copy `frontend/src/` contents into your project's `src/` (lib/, components/support/, pages/).
2. Add routes:
```tsx
<Route path="/help" element={<HelpCenter />} />
<Route path="/help/:slug" element={<HelpArticlePage />} />
<Route path="/contact" element={<Contact />} />
<Route path="/support/track" element={<TrackTicket />} />
<Route path="/admin/support" element={<YourAdminGuard><SupportAdmin /></YourAdminGuard>} />
```
Framework mode (`routes.ts`): `route("help", "pages/HelpCenter.tsx")`, `route("help/:slug", "pages/HelpArticle.tsx")`, and so on.
3. Set `VITE_API_URL` (see `frontend/.env.example`).
4. In `src/lib/supportApi.ts`, edit `getAuthToken()` if your admin token isn't stored in `localStorage` under "token".
5. Fill in `CONTACT.email` in `src/lib/contactInfo.ts`.

## 3. Footer
Replace the local `CONTACT` constant with `import { CONTACT } from "../lib/contactInfo";` and update these links:
```tsx
{ label: "Contact", path: "/contact" },
{ label: "Help Center", path: "/help" },
{ label: "Provider Support", path: "/help?category=providers" },
{ label: "Safety", path: "/help?category=trust-safety" },
```

## 4. Test it
```
curl -X POST $API/api/contact -H "content-type: application/json" \
  -d '{"name":"Test User","email":"you@example.com","topic":"general","subject":"Hello","message":"Testing the contact form"}'
curl $API/api/help/categories
curl "$API/api/help/articles?q=refund"
```
Then on the live site: submit the form, check `/support/track`, and reply from `/admin/support`.

## Check before launch
- **The "Paying in the app" article** must match how your payments really work. Edit it so it only promises what you deliver.
- **`CONTACT.responseTime`** says "within 24 hours". Change it if you can't honour that.
- Tickets save even when email isn't set up, but nobody gets notified. Set up SMTP or watch the inbox page.
- Admin routes are only as safe as your `requireAdmin` middleware.
