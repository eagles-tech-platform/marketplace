const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Basic", "Pro"
    tier: { type: String, enum: ["basic", "pro"], required: true, unique: true },
    role: { type: String, enum: ["provider", "customer", "both"], default: "both" },
    priceNgnMonthly: { type: Number, required: true },
    priceNgnYearly: { type: Number, required: true },
    priceUsdMonthly: { type: Number, required: true },
    priceUsdYearly: { type: Number, required: true },
    // Free-form list of feature/limit descriptions shown on the pricing page —
    // kept as plain strings rather than a rigid schema so plans can change
    // without a migration every time.
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
