const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMyRequest,
  listRequests,
  scheduleCall,
  completeCall,
  decide,
  markBadgeFeePaid,
} = require("../controllers/verificationController");

const router = express.Router();

// Provider-facing
router.post("/requests", protect, requireRole("provider"), createRequest);
router.get("/requests/me", protect, requireRole("provider"), getMyRequest);
router.post("/requests/:id/pay-badge-fee", protect, requireRole("provider"), markBadgeFeePaid);

// Admin-facing
router.get("/requests", protect, requireRole("admin"), listRequests);
router.patch("/requests/:id/schedule-call", protect, requireRole("admin"), scheduleCall);
router.patch("/requests/:id/complete-call", protect, requireRole("admin"), completeCall);
router.patch("/requests/:id/decide", protect, requireRole("admin"), decide);

module.exports = router;
