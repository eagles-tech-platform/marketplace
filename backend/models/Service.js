const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    niche: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    priceType: { type: String, enum: ["fixed", "hourly", "negotiable"], default: "fixed" },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
