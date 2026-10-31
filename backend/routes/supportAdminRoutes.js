const express = require("express");
const {
  getStats, listTickets, updateTicketStatus, replyToTicket,
  adminListArticles, createArticle, updateArticle, deleteArticle,
} = require("../controllers/supportAdminController");

// No auth here on purpose: this router is mounted inside adminRoutes.js,
// which already runs router.use(protect, requireRole("admin")) first.
const router = express.Router();

router.get("/stats", getStats);
router.get("/tickets", listTickets);
router.patch("/tickets/:id/status", updateTicketStatus);
router.post("/tickets/:id/reply", replyToTicket);

router.get("/articles", adminListArticles);
router.post("/articles", createArticle);
router.put("/articles/:id", updateArticle);
router.delete("/articles/:id", deleteArticle);

module.exports = router;
