const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tier: { type: String, enum: ["basic", "pro"], required: true },
  role: { type: String, enum: ["provider", "customer", "both"], default: "both" },
  priceNgnMonthly: { type: Number, required: true, min: 0 },
  priceNgnQuarterly: { type: Number, min: 0 },
  priceNgnYearly: { type: Number, required: true, min: 0 },
  priceUsdMonthly: { type: Number, required: true, min: 0 },
  priceUsdQuarterly: { type: Number, min: 0 },
  priceUsdYearly: { type: Number, required: true, min: 0 },
  features: [{ type: String }],
  gatewayPlans: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

subscriptionPlanSchema.index({ tier: 1 }, { unique: true });
module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
