const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  createFeedback,
  getMyFeedback,
  listFeedback,
  replyToFeedback,
  closeFeedback,
} = require("../controllers/feedbackController");

const router = express.Router();

router.post("/", protect, createFeedback);
router.get("/mine", protect, getMyFeedback);
router.get("/", protect, requireRole("admin"), listFeedback);
router.patch("/:id/reply", protect, requireRole("admin"), replyToFeedback);
router.patch("/:id/close", protect, requireRole("admin"), closeFeedback);

module.exports = router;
