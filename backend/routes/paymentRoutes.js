const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  flutterwaveWebhook,
  getBanks,
  addPayoutAccount,
  getMyEarnings,
  requestWithdrawal,
  getMyWithdrawals,
  listWithdrawals,
  decideWithdrawal,
} = require("../controllers/paymentController");

const router = express.Router();

// Tighter limit for routes that create payments or change payout details.
// (`max` works on express-rate-limit v6 and v7; v7 also accepts `limit`.)
const payLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

// Webhooks: NOT rate limited (gateways must never be throttled). The app-wide
// express.json({ verify }) in server.js sets req.rawBody, which Paystack's
// signature check needs, so don't remove that hook.
router.post("/webhook/paystack", paystackWebhook);
router.post("/webhook/flutterwave", flutterwaveWebhook);

router.post("/initialize", payLimiter, protect, initializePayment);
router.get("/verify/:reference", protect, verifyPayment);
router.get("/banks", protect, getBanks);
router.get("/earnings", protect, getMyEarnings);
router.post("/payout-account", payLimiter, protect, addPayoutAccount);

// Manual withdrawal fallback
router.post("/withdrawals", payLimiter, protect, requestWithdrawal);
router.get("/withdrawals/mine", protect, getMyWithdrawals);
router.get("/withdrawals", protect, requireRole("admin"), listWithdrawals);
router.patch("/withdrawals/:id/decide", protect, requireRole("admin"), decideWithdrawal);

module.exports = router;