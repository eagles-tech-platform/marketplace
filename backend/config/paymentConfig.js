// Central place for payment behavior so nothing is hardcoded in multiple spots.

// Platform's cut of every service-booking payment. Assumed 0.5% from your
// description ("small per-transaction fee, adds up over volume") — change
// this one number if that's wrong, everything downstream reads from here.
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 0.5);

// "simulate" — no real gateway call is made; payments resolve as successful
//   immediately so you can test signup/booking flows end-to-end today.
// "live" — real Paystack/Flutterwave API calls + webhook verification.
// Flip via PAYMENTS_MODE in .env once you're deployed with real keys and a
// public webhook URL.
const PAYMENTS_MODE = (process.env.PAYMENTS_MODE || "simulate").toLowerCase();

const isLive = () => PAYMENTS_MODE === "live";

module.exports = { PLATFORM_FEE_PERCENT, PAYMENTS_MODE, isLive };
