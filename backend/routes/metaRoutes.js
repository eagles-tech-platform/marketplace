const express = require("express");
const { nigerianStates, internationalCountries } = require("../data/locations");
const { jobCategories, totalNiches } = require("../data/jobCategories");
const Category = require("../models/Category");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const router = express.Router();

// GET /api/meta/locations
router.get("/locations", (req, res) => {
  res.json({ nigerianStates, internationalCountries });
});

// GET /api/meta/categories — reads from DB if seeded, falls back to static file
router.get("/categories", async (req, res) => {
  try {
    const fromDb = await Category.find().sort({ name: 1 });
    if (fromDb.length > 0) return res.json({ categories: fromDb });
    return res.json({ categories: jobCategories });
  } catch (err) {
    return res.json({ categories: jobCategories });
  }
});

// GET /api/meta/stats — real, public platform numbers for the homepage/about page.
// Every value here is a live count against the database, not a placeholder.
router.get("/stats", async (req, res) => {
  try {
    const [
      totalProviders,
      totalCustomers,
      totalServices,
      completedBookings,
      reviewStats,
    ] = await Promise.all([
      User.countDocuments({ canBeProvider: true, providerApprovalStatus: "approved", isActive: true }),
      User.countDocuments({ canBeCustomer: true, isActive: true }),
      Service.countDocuments({ isActive: true }),
      Booking.countDocuments({ status: "completed" }),
      Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            total: { $sum: 1 },
            satisfied: { $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const reviewData = reviewStats[0] || { avgRating: 0, total: 0, satisfied: 0 };

    const categoryProviderCounts = await User.aggregate([
      { $match: { canBeProvider: true, providerApprovalStatus: "approved", isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const providersByCategory = {};
    categoryProviderCounts.forEach((c) => { if (c._id) providersByCategory[c._id] = c.count; });

    return res.json({
      totalProviders,
      totalCustomers,
      totalServices,
      completedBookings,
      avgRating: reviewData.total > 0 ? Math.round(reviewData.avgRating * 10) / 10 : 0,
      satisfactionRate: reviewData.total > 0 ? Math.round((reviewData.satisfied / reviewData.total) * 100) : 0,
      totalCategories: jobCategories.length,
      totalNiches,
      totalStates: nigerianStates.length,
      providersByCategory,
    });
  } catch (err) {
    console.error("[meta] stats error:", err);
    return res.status(500).json({ message: "Could not fetch platform stats." });
  }
});

module.exports = router;
