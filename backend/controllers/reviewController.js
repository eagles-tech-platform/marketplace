const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const { notify } = require("../utils/notify");

/** Recomputes the average + count for a service AND its provider after any
 * review change — kept as one small helper so create/reply stay consistent. */
async function recalcAggregates(serviceId, providerId) {
  const serviceStats = await Review.aggregate([
    { $match: { service: serviceId } },
    { $group: { _id: "$service", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const s = serviceStats[0] || { avg: 0, count: 0 };
  await Service.findByIdAndUpdate(serviceId, {
    rating: Math.round((s.avg || 0) * 10) / 10,
    reviewCount: s.count,
  });

  const providerStats = await Review.aggregate([
    { $match: { provider: providerId } },
    { $group: { _id: "$provider", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const p = providerStats[0] || { avg: 0, count: 0 };
  await User.findByIdAndUpdate(providerId, {
    ratingAvg: Math.round((p.avg || 0) * 10) / 10,
    ratingCount: p.count,
  });
}

// POST /api/reviews  (customer)
// body: { bookingId, rating, comment }
async function createReview(req, res) {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ message: "bookingId and rating are required." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your booking." });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only review a completed booking." });
    }

    const existing = await Review.findOne({ booking: booking._id });
    if (existing) {
      return res.status(409).json({ message: "You've already reviewed this booking." });
    }

    const review = await Review.create({
      booking: booking._id,
      service: booking.service,
      provider: booking.provider,
      customer: req.user._id,
      rating,
      comment: comment || "",
    });

    await recalcAggregates(booking.service, booking.provider);

    await notify({
      userId: booking.provider,
      type: "review",
      title: "New review received",
      message: `${req.user.name} left a ${rating}-star review.`,
      link: "/provider/services",
    });

    return res.status(201).json({ message: "Review submitted.", review });
  } catch (err) {
    console.error("[reviews] createReview error:", err);
    return res.status(500).json({ message: "Could not submit review." });
  }
}

// GET /api/reviews/service/:serviceId  (public)
async function listByService(req, res) {
  try {
    const reviews = await Review.find({ service: req.params.serviceId })
      .populate("customer", "name avatar")
      .sort({ createdAt: -1 });
    return res.json({ reviews });
  } catch (err) {
    console.error("[reviews] listByService error:", err);
    return res.status(500).json({ message: "Could not fetch reviews." });
  }
}

// GET /api/reviews/mine  (provider) — reviews left on any of their services
async function getMyReviews(req, res) {
  try {
    const reviews = await Review.find({ provider: req.user._id })
      .populate("customer", "name avatar")
      .populate("service", "title")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ reviews, ratingAvg: req.user.ratingAvg, ratingCount: req.user.ratingCount });
  } catch (err) {
    console.error("[reviews] getMyReviews error:", err);
    return res.status(500).json({ message: "Could not fetch your reviews." });
  }
}

// PATCH /api/reviews/:id/reply  (provider — must own the reviewed service)
async function replyToReview(req, res) {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ message: "Reply can't be empty." });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    if (String(review.provider) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only reply to reviews on your own services." });
    }

    review.providerReply = reply.trim();
    await review.save();

    await notify({
      userId: review.customer,
      type: "review",
      title: "Provider replied to your review",
      message: reply.trim().slice(0, 80),
      link: "/dashboard/bookings",
    });

    return res.json({ message: "Reply posted.", review });
  } catch (err) {
    console.error("[reviews] replyToReview error:", err);
    return res.status(500).json({ message: "Could not post reply." });
  }
}

// GET /api/reviews/eligible-bookings  (customer) — completed bookings with no review yet
async function getEligibleBookings(req, res) {
  try {
    const completed = await Booking.find({ customer: req.user._id, status: "completed" }).select("_id");
    const reviewed = await Review.find({ booking: { $in: completed.map((b) => b._id) } }).select("booking");
    const reviewedIds = new Set(reviewed.map((r) => String(r.booking)));
    const eligibleIds = completed.map((b) => String(b._id)).filter((id) => !reviewedIds.has(id));
    return res.json({ bookingIds: eligibleIds });
  } catch (err) {
    console.error("[reviews] getEligibleBookings error:", err);
    return res.status(500).json({ message: "Could not check review eligibility." });
  }
}

// GET /api/reviews/admin/all  (admin) — every review, for moderation
async function listAllReviews(req, res) {
  try {
    const reviews = await Review.find()
      .populate("customer", "name avatar")
      .populate("provider", "name")
      .populate("service", "title")
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ reviews });
  } catch (err) {
    console.error("[reviews] listAllReviews error:", err);
    return res.status(500).json({ message: "Could not fetch reviews." });
  }
}

// DELETE /api/reviews/:id  (admin) — for abusive/inappropriate reviews
async function deleteReview(req, res) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });

    const { service, provider } = review;
    await review.deleteOne();
    // Ratings must reflect the removal immediately, not just the review list.
    await recalcAggregates(service, provider);

    return res.json({ message: "Review removed." });
  } catch (err) {
    console.error("[reviews] deleteReview error:", err);
    return res.status(500).json({ message: "Could not remove review." });
  }
}

// GET /api/reviews/featured  (public) — a few real, well-rated reviews for the homepage
async function getFeaturedReviews(req, res) {
  try {
    const reviews = await Review.find({ rating: { $gte: 4 }, comment: { $ne: "" } })
      .populate("customer", "name")
      .populate("service", "title")
      .sort({ createdAt: -1 })
      .limit(3);
    return res.json({ reviews });
  } catch (err) {
    console.error("[reviews] getFeaturedReviews error:", err);
    return res.status(500).json({ message: "Could not fetch reviews." });
  }
}

module.exports = {
  createReview,
  listByService,
  getMyReviews,
  replyToReview,
  getEligibleBookings,
  listAllReviews,
  deleteReview,
  getFeaturedReviews,
};
