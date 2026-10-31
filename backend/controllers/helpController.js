const HelpArticle = require("../models/HelpArticle");
const { CATEGORIES, CATEGORY_IDS } = require("../utils/supportConstants");
const { clean, escapeRegex } = require("../utils/supportValidation");

const LIST_FIELDS = { title: 1, slug: 1, category: 1, summary: 1, featured: 1 };

// GET /api/help/categories
async function listCategories(req, res) {
  try {
    const counts = await HelpArticle.aggregate([
      { $match: { published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.set("Cache-Control", "public, max-age=60");
    return res.json(CATEGORIES.map((c) => ({ ...c, count: map[c.id] || 0 })));
  } catch (err) {
    console.error("[help] listCategories error:", err);
    return res.status(500).json({ message: "Could not load help topics." });
  }
}

// GET /api/help/articles?category=&q=&featured=true
async function listArticles(req, res) {
  try {
    const category = clean(req.query.category);
    const q = clean(req.query.q).slice(0, 100);
    if (category && !CATEGORY_IDS.includes(category)) return res.status(400).json({ message: "Invalid category." });

    const base = { published: true };
    if (category) base.category = category;
    if (req.query.featured === "true") base.featured = true;

    let items = [];
    if (q) {
      items = await HelpArticle.find({ ...base, $text: { $search: q } }, { ...LIST_FIELDS, score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } }).limit(30).lean();
      if (items.length === 0) {
        // Text search ignores partial words ("pay" vs "payments"), so fall back to a substring match.
        const rx = new RegExp(escapeRegex(q), "i");
        items = await HelpArticle.find({ ...base, $or: [{ title: rx }, { summary: rx }, { tags: rx }] }, LIST_FIELDS).limit(30).lean();
      }
    } else {
      items = await HelpArticle.find(base, LIST_FIELDS).sort({ featured: -1, title: 1 }).limit(30).lean();
    }
    return res.json(items);
  } catch (err) {
    console.error("[help] listArticles error:", err);
    return res.status(500).json({ message: "Could not load articles." });
  }
}

// GET /api/help/articles/:slug
async function getArticle(req, res) {
  try {
    const slug = clean(req.params.slug).toLowerCase();
    if (!/^[a-z0-9-]{1,160}$/.test(slug)) return res.status(404).json({ message: "Article not found." });
    const article = await HelpArticle.findOneAndUpdate({ slug, published: true }, { $inc: { views: 1 } }, { new: true }).lean();
    if (!article) return res.status(404).json({ message: "Article not found." });
    const related = await HelpArticle.find(
      { category: article.category, published: true, _id: { $ne: article._id } },
      { title: 1, slug: 1, summary: 1, category: 1 }
    ).limit(3).lean();
    return res.json({ article, related });
  } catch (err) {
    console.error("[help] getArticle error:", err);
    return res.status(500).json({ message: "Could not load the article." });
  }
}

// POST /api/help/articles/:slug/feedback   body: { helpful: boolean }
async function articleFeedback(req, res) {
  try {
    const slug = clean(req.params.slug).toLowerCase();
    if (!/^[a-z0-9-]{1,160}$/.test(slug) || typeof req.body.helpful !== "boolean") {
      return res.status(400).json({ message: "Invalid request." });
    }
    const result = await HelpArticle.updateOne(
      { slug, published: true },
      { $inc: req.body.helpful ? { helpful: 1 } : { notHelpful: 1 } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: "Article not found." });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[help] articleFeedback error:", err);
    return res.status(500).json({ message: "Could not save your feedback." });
  }
}

module.exports = { listCategories, listArticles, getArticle, articleFeedback };
