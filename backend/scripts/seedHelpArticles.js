// Adds the starter Help Center articles.
// Run from the backend folder:  node scripts/seedHelpArticles.js
// Safe to re-run: existing articles are left alone, so edits you make later are kept.
require("dotenv").config();
const mongoose = require("mongoose");
const HelpArticle = require("../models/HelpArticle");

const articles = [
  {
    title: "How Quantum MarketPlace works",
    category: "getting-started", featured: true, tags: ["start", "how it works", "booking"],
    summary: "From searching for a provider to leaving a review, in six steps.",
    content: `Quantum MarketPlace helps you hire local artisans you can trust.

## The steps

1. Search by service, location or the Verified filter.
2. Chat with providers inside the app and compare profiles.
3. Agree on a price before any work begins.
4. Pay inside the app.
5. Confirm when the job is done.
6. Leave a review so the next customer knows who to trust.

## Why chat first

You can talk to a provider before either side shares a phone number. That keeps you in control until you are comfortable.`,
  },
  {
    title: "Finding and booking a provider",
    category: "getting-started", tags: ["search", "book", "provider", "price"],
    summary: "Search, compare and agree a price with a provider.",
    content: `## Find the right person

Search by the service you need, such as a plumber, tailor or generator technician, then narrow the results by location. Turn on the Verified filter to see only providers who passed our checks.

## Before you book

- Read the provider's profile, ratings and past work.
- Ask questions in the in-app chat.
- Agree on the price and what it includes before the job starts.

If the price changes during the job, agree the new amount in the chat first so there is a record.`,
  },
  {
    title: "Paying in the app",
    category: "payments", featured: true, tags: ["payment", "pay", "refund", "paystack", "flutterwave"],
    summary: "Why we ask you to pay inside the app and what to do if a job goes wrong.",
    content: `## Why pay in the app

Paying inside the app keeps a record of the job, the agreed price and your chat. If something goes wrong, we can look at that record and help.

## If something goes wrong

If a job was not completed as agreed, contact us as soon as you can. Use the contact form, choose Payment as the topic, and include the provider's name and what happened. We review the chat history and payment record before deciding how to help.

## Please do not pay outside the app

Payments made outside the app, such as cash or direct transfers, cannot be checked by us, so we are not able to help recover them.`,
  },
  {
    title: "What the Verified badge means",
    category: "trust-safety", featured: true, tags: ["verified", "badge", "trust", "video call", "identity"],
    summary: "How providers earn the badge and why it matters.",
    content: `A Verified badge means a real person from our team checked the provider before they received it.

## How a provider gets verified

1. They submit photos of their work, a short note and the times they can take a video call.
2. We schedule a live video call with a member of our team.
3. We review their work and how the call went.
4. If everything checks out, they pay the one-time badge fee where it applies and the Verified badge is added to their profile.

## What it does not mean

The badge shows we checked identity and work history. It does not guarantee a result on any particular job, so please still read reviews and agree the details in the chat.`,
  },
  {
    title: "Staying safe when you hire",
    category: "trust-safety", tags: ["safety", "security", "scam", "stranger"],
    summary: "Simple habits that keep you and your home safe.",
    content: `## Before the job

- Choose Verified providers where you can.
- Keep the conversation in the app until you are comfortable.
- Share your phone number only when you decide to.

## During the job

- Let someone know a provider is visiting.
- Keep high-value items out of the work area.

## Things to avoid

- Paying outside the app.
- Providers who rush you or refuse to put the price in writing.

If anything feels wrong, stop the job and contact us.`,
  },
  {
    title: "Reporting a problem or a provider",
    category: "trust-safety", tags: ["report", "complaint", "abuse", "dispute"],
    summary: "How to tell us about unsafe behaviour or a job that went wrong.",
    content: `Use the contact form and choose Report a provider as the topic.

## What to include

- The provider's name or profile link.
- When it happened.
- What happened, in your own words.
- Screenshots of the chat, if you have them.

We keep reports confidential from the provider where we can, and we review every one.`,
  },
  {
    title: "Becoming a provider",
    category: "providers", featured: true, tags: ["provider", "artisan", "join", "sign up", "verification"],
    summary: "Create your profile, get verified and start receiving requests.",
    content: `## Get started

1. Sign up and choose the provider option.
2. Wait for our team to approve your provider application.
3. Once approved, add your services, prices and photos of your past work.
4. Apply for the Verified badge by submitting your work photos and booking a live video call.

## Tips for more bookings

- Use clear, recent photos of finished work.
- Reply to messages quickly.
- Be upfront about prices.

You do not need a brand or a website. Your profile and reviews do the work.`,
  },
  {
    title: "The Founding Member Program",
    category: "providers", tags: ["founding", "free", "membership", "provider"],
    summary: "Free access for our first 1,000 providers.",
    content: `The first 1,000 providers to join get free access to Quantum MarketPlace.

## How it works

- The first 300 providers get 6 months free.
- The next 700 providers get 2 months free.

During your free period we will show you the leads and jobs the platform sent your way, so you can decide whether a paid membership is worth it before you pay anything.`,
  },
  {
    title: "Keeping your account secure",
    category: "account", tags: ["password", "2fa", "login", "security", "reset"],
    summary: "Passwords, two-factor sign-in and what to do if you are locked out.",
    content: `## Use a strong password

Pick a password you do not use anywhere else, and never share it, even with someone who says they work for us. We will never ask for your password.

## Turn on two-factor sign-in

Two-factor sign-in asks for a code when you log in, so a stolen password alone is not enough.

## Forgot your password?

Use the Forgot password link on the login page and follow the email we send you. If the email does not arrive, check your spam folder, then contact us.`,
  },
];
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in backend/.env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  await HelpArticle.init(); // makes sure the search index exists
  let added = 0;
  for (const a of articles) {
    const slug = slugify(a.title);
    const r = await HelpArticle.updateOne({ slug }, { $setOnInsert: { ...a, slug } }, { upsert: true });
    if (r.upsertedCount) added++;
  }
  console.log(`Help articles: ${added} added, ${articles.length - added} already existed.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
