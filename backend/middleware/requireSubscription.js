const Subscription = require("../models/Subscription");

/**
 * Require an unexpired membership for a specific audience.
 * Apply only to premium routes/features; public browsing and normal bookings
 * should remain available unless your product policy explicitly says otherwise.
 */
function requireActiveSubscription(audience) {
  if (!["customer", "provider"].includes(audience)) throw new Error("audience must be customer or provider");
  return async function subscriptionGuard(req, res, next) {
    try {
      const now = new Date();
      const sub = await Subscription.findOne({ user: req.user._id, audience });
      if (!sub) return res.status(402).json({ code: "SUBSCRIPTION_REQUIRED", message: "An active membership is required for this feature." });
      const active = sub.status === "active" && sub.currentPeriodEnd && sub.currentPeriodEnd > now;
      const founding = sub.status === "founding_free" && sub.freeUntil && sub.freeUntil > now;
      const grace = sub.status === "past_due" && sub.graceUntil && sub.graceUntil > now;
      const nonRenewing = sub.status === "non_renewing" && sub.currentPeriodEnd && sub.currentPeriodEnd > now;
      if (!active && !founding && !grace && !nonRenewing) {
        return res.status(402).json({ code: "SUBSCRIPTION_EXPIRED", message: "Your membership has expired or needs payment. Renew to continue using this feature." });
      }
      req.subscription = sub;
      return next();
    } catch (err) {
      console.error("[subscription-guard]", err.message);
      return res.status(500).json({ message: "Could not verify membership." });
    }
  };
}

module.exports = { requireActiveSubscription };
