const mongoose = require("mongoose");

const nicheSchema = new mongoose.Schema(
  { name: { type: String, required: true }, slug: { type: String, required: true } },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, default: "" },
    description: { type: String, default: "" },
    niches: [nicheSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
