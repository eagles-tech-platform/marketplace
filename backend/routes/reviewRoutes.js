const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  createReview,
  listByService,
  getMyReviews,
  replyToReview,
  getEligibleBookings,
  listAllReviews,
  deleteReview,
  getFeaturedReviews,
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/featured", getFeaturedReviews);
router.get("/service/:serviceId", listByService);
router.post("/", protect, createReview);
router.get("/eligible-bookings", protect, getEligibleBookings);
router.get("/mine", protect, requireRole("provider"), getMyReviews);
router.patch("/:id/reply", protect, requireRole("provider"), replyToReview);
router.get("/admin/all", protect, requireRole("admin"), listAllReviews);
router.delete("/:id", protect, requireRole("admin"), deleteReview);

module.exports = router;
