const RecommendationRequest = require("../models/RecommendationRequest");
const User = require("../models/User");

// POST /api/recommendations  (customer)
async function createRequest(req, res) {
  try {
    const { category, niche, state, budget, notes } = req.body;
    if (!category || !niche) {
      return res.status(400).json({ message: "Category and niche are required." });
    }

    const request = await RecommendationRequest.create({
      customer: req.user._id,
      category,
      niche,
      state: state || "",
      budget: budget || undefined,
      notes: notes || "",
    });

    return res.status(201).json({ message: "Request created. Pay the recommendation fee to get matched.", request });
  } catch (err) {
    console.error("[recommendations] createRequest error:", err);
    return res.status(500).json({ message: "Could not create request." });
  }
}

// GET /api/recommendations/mine  (customer)
async function getMyRequests(req, res) {
  try {
    const requests = await RecommendationRequest.find({ customer: req.user._id })
      .populate({
        path: "matchedProviders.provider",
        select: "name avatar category niche state city isVerifiedBadge ratingAvg ratingCount",
      })
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    console.error("[recommendations] getMyRequests error:", err);
    return res.status(500).json({ message: "Could not fetch your requests." });
  }
}

// GET /api/recommendations/:id  (customer — must own it)
async function getRequest(req, res) {
  try {
    const request = await RecommendationRequest.findById(req.params.id).populate({
      path: "matchedProviders.provider",
      select: "name avatar category niche state city isVerifiedBadge ratingAvg ratingCount",
    });
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (String(request.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your request." });
    }
    return res.json({ request });
  } catch (err) {
    console.error("[recommendations] getRequest error:", err);
    return res.status(500).json({ message: "Could not fetch request." });
  }
}

/**
 * The actual matching logic. Ranks approved, active providers in the
 * requested category/niche. Scoring, highest first:
 *   - Same state as requested: +3  (location match matters most)
 *   - Verified badge:          +2
 *   - Rating average:          + ratingAvg (0-5)
 *   - Has at least one rating: +0.5  (tiny nudge for providers with any track record)
 * Returns the top 5. Called once a recommendation_fee payment succeeds —
 * see controllers/paymentController.js.
 */
async function matchProviders(request) {
  const candidates = await User.find({
    canBeProvider: true,
    providerApprovalStatus: "approved",
    isActive: true,
    category: request.category,
    niche: request.niche,
  }).select("name state ratingAvg ratingCount isVerifiedBadge");

  const scored = candidates
    .map((provider) => {
      let score = 0;
      if (request.state && provider.state === request.state) score += 3;
      if (provider.isVerifiedBadge) score += 2;
      score += provider.ratingAvg || 0;
      if (provider.ratingCount > 0) score += 0.5;
      return { provider: provider._id, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  request.matchedProviders = scored;
  request.status = "matched";
  await request.save();
  return request;
}

module.exports = { createRequest, getMyRequests, getRequest, matchProviders };
