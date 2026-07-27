const mongoose = require("mongoose");

const matchedProviderSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const recommendationRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    niche: { type: String, required: true },
    state: { type: String, default: "" }, // optional — narrows matches to the same location when given
    budget: { type: Number }, // optional — informational, not currently used to filter
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending_payment", "matched"],
      default: "pending_payment",
    },
    matchedProviders: [matchedProviderSchema],
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecommendationRequest", recommendationRequestSchema);
