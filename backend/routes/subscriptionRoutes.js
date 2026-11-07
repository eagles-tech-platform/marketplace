const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  getBillingCapabilities, getPlans, getFoundingMemberStatus, getMySubscription, getMyHistory,
  subscribe, verifySubscriptionPayment, cancelMySubscription, requestRetry,
  adminListSubscriptions, adminCancelSubscription,
} = require("../controllers/subscriptionController");

const router = express.Router();
const billingLimiter = rateLimit({ windowMs: 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { message: "Too many billing requests. Please wait and try again." } });

router.get("/capabilities", getBillingCapabilities);
router.get("/plans", getPlans);
router.get("/founding-status", getFoundingMemberStatus);
router.get("/mine", protect, getMySubscription);
router.get("/history", protect, getMyHistory);
router.post("/subscribe", billingLimiter, protect, subscribe);
router.get("/verify/:reference", protect, verifySubscriptionPayment);
router.post("/:id/cancel", billingLimiter, protect, cancelMySubscription);
router.post("/:id/retry", billingLimiter, protect, requestRetry);
router.get("/admin/all", protect, requireRole("admin"), adminListSubscriptions);
router.post("/admin/:id/cancel", billingLimiter, protect, requireRole("admin"), adminCancelSubscription);

module.exports = router;
