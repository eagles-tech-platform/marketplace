const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getPlans,
  getFoundingMemberStatus,
  getMySubscription,
  subscribe,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", getPlans);
router.get("/founding-status", getFoundingMemberStatus);
router.get("/mine", protect, getMySubscription);
router.post("/subscribe", protect, subscribe);

module.exports = router;
