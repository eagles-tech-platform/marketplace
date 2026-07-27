const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  listProviderApplications,
  decideProviderApplication,
  listUsers,
  updateUserStatus,
  getLoginActivity,
  getDashboardSummary,
  listPayments,
  listBookings,
  sendBroadcast,
  getBroadcastHistory,
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, requireRole("admin"));

router.get("/dashboard-summary", getDashboardSummary);
router.get("/provider-applications", listProviderApplications);
router.patch("/provider-applications/:id/decide", decideProviderApplication);
router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/login-activity", getLoginActivity);
router.get("/payments", listPayments);
router.get("/bookings", listBookings);
router.post("/notifications/broadcast", sendBroadcast);
router.get("/notifications/history", getBroadcastHistory);

module.exports = router;
