const mongoose = require("mongoose");
const { CATEGORY_IDS } = require("../utils/supportConstants");

const helpArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: CATEGORY_IDS, required: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true, index: true },
    views: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
  },
  { timestamps: true }
);

helpArticleSchema.index(
  { title: "text", summary: "text", content: "text", tags: "text" },
  { weights: { title: 10, tags: 6, summary: 4, content: 1 } }
);

module.exports = mongoose.models.HelpArticle || mongoose.model("HelpArticle", helpArticleSchema);
