const express = require("express");
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

// NOTE on webhooks: Paystack's signature check needs the RAW request body
// bytes (not the parsed JSON) — server.js mounts these two routes with
// express.json({ verify: ... }) so req.rawBody is available. Don't move
// these behind the app-wide json parser without that verify hook or
// Paystack signature verification will always fail.
router.post("/webhook/paystack", paystackWebhook);
router.post("/webhook/flutterwave", flutterwaveWebhook);

router.post("/initialize", protect, initializePayment);
router.get("/verify/:reference", protect, verifyPayment);
router.get("/banks", protect, getBanks);
router.get("/earnings", protect, getMyEarnings);
router.post("/payout-account", protect, addPayoutAccount);

// Manual withdrawal fallback
router.post("/withdrawals", protect, requestWithdrawal);
router.get("/withdrawals/mine", protect, getMyWithdrawals);
router.get("/withdrawals", protect, requireRole("admin"), listWithdrawals);
router.patch("/withdrawals/:id/decide", protect, requireRole("admin"), decideWithdrawal);

module.exports = router;
