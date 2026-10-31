const express = require("express");
const rateLimit = require("express-rate-limit");
const { listCategories, listArticles, getArticle, articleFeedback } = require("../controllers/helpController");

const router = express.Router();
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

router.get("/categories", listCategories);
router.get("/articles", listArticles);
router.get("/articles/:slug", getArticle);
router.post("/articles/:slug/feedback", feedbackLimiter, articleFeedback);

module.exports = router;
