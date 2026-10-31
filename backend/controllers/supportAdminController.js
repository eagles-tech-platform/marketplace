const SupportTicket = require("../models/SupportTicket");
const HelpArticle = require("../models/HelpArticle");
const { STATUSES, CATEGORY_IDS } = require("../utils/supportConstants");
const { clean, isObjectId, escapeRegex } = require("../utils/supportValidation");
const { sendStaffReply } = require("../utils/supportMail");

const bad = (res, message) => res.status(400).json({ message });
const hidePrivate = "-ip -userAgent";

// GET /api/admin/support/stats
async function getStats(req, res) {
  try {
    const rows = await SupportTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const stats = { open: 0, in_progress: 0, resolved: 0 };
    rows.forEach((r) => { stats[r._id] = r.count; });
    return res.json({ ...stats, total: stats.open + stats.in_progress + stats.resolved });
  } catch (err) {
    console.error("[support-admin] getStats error:", err);
    return res.status(500).json({ message: "Could not load ticket counts." });
  }
}

// GET /api/admin/support/tickets?status=&q=&page=
async function listTickets(req, res) {
  try {
    const status = clean(req.query.status);
    const q = clean(req.query.q).slice(0, 100);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    if (status && !STATUSES.includes(status)) return bad(res, "Invalid status.");

    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ ticketId: rx }, { email: rx }, { name: rx }, { subject: rx }];
    }
    const limit = 20;
    const [items, total] = await Promise.all([
      SupportTicket.find(filter).select(hidePrivate).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SupportTicket.countDocuments(filter),
    ]);
    return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error("[support-admin] listTickets error:", err);
    return res.status(500).json({ message: "Could not load tickets." });
  }
}

// PATCH /api/admin/support/tickets/:id/status   body: { status }
async function updateTicketStatus(req, res) {
  try {
    const status = clean(req.body.status);
    if (!isObjectId(req.params.id) || !STATUSES.includes(status)) return bad(res, "Invalid request.");
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true }).select(hidePrivate).lean();
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    return res.json(ticket);
  } catch (err) {
    console.error("[support-admin] updateTicketStatus error:", err);
    return res.status(500).json({ message: "Could not update the ticket." });
  }
}

// POST /api/admin/support/tickets/:id/reply   body: { message }
async function replyToTicket(req, res) {
  try {
    const message = clean(req.body.message);
    if (!isObjectId(req.params.id) || message.length < 2 || message.length > 3000) return bad(res, "Write a reply of at least 2 characters.");
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    ticket.replies.push({ by: "staff", message });
    if (ticket.status === "open") ticket.status = "in_progress";
    await ticket.save();
    sendStaffReply(ticket, message); // fire and forget
    const { ip, userAgent, ...safe } = ticket.toObject();
    return res.json(safe);
  } catch (err) {
    console.error("[support-admin] replyToTicket error:", err);
    return res.status(500).json({ message: "Could not send the reply." });
  }
}

// ---------- Help articles (manage Help Center content) ----------
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

function parseArticle(b, partial) {
  const d = {};
  const has = (k) => b[k] !== undefined;
  if (!partial || has("title")) { d.title = clean(b.title); if (d.title.length < 3 || d.title.length > 150) return { error: "Title must be 3 to 150 characters." }; }
  if (!partial || has("category")) { d.category = clean(b.category); if (!CATEGORY_IDS.includes(d.category)) return { error: "Choose a valid category." }; }
  if (!partial || has("summary")) { d.summary = clean(b.summary); if (d.summary.length < 5 || d.summary.length > 300) return { error: "Summary must be 5 to 300 characters." }; }
  if (!partial || has("content")) { d.content = clean(b.content); if (d.content.length < 20) return { error: "Content is too short." }; }
  if (has("tags")) d.tags = Array.isArray(b.tags) ? b.tags.map(clean).filter(Boolean).slice(0, 10) : [];
  if (has("featured")) d.featured = b.featured === true;
  if (has("published")) d.published = b.published === true;
  return { data: d };
}

// GET /api/admin/support/articles
async function adminListArticles(req, res) {
  try { return res.json(await HelpArticle.find().sort({ updatedAt: -1 }).select("-content").lean()); }
  catch (err) { console.error("[support-admin] adminListArticles error:", err); return res.status(500).json({ message: "Could not load articles." }); }
}

// POST /api/admin/support/articles
async function createArticle(req, res) {
  try {
    const { data, error } = parseArticle(req.body || {}, false);
    if (error) return bad(res, error);
    const article = await HelpArticle.create({ ...data, slug: slugify(data.title) });
    return res.status(201).json(article);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An article with that title already exists." });
    console.error("[support-admin] createArticle error:", err);
    return res.status(500).json({ message: "Could not create the article." });
  }
}

// PUT /api/admin/support/articles/:id   (slug stays fixed so existing links keep working)
async function updateArticle(req, res) {
  try {
    if (!isObjectId(req.params.id)) return bad(res, "Invalid article id.");
    const { data, error } = parseArticle(req.body || {}, true);
    if (error) return bad(res, error);
    const article = await HelpArticle.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).lean();
    if (!article) return res.status(404).json({ message: "Article not found." });
    return res.json(article);
  } catch (err) {
    console.error("[support-admin] updateArticle error:", err);
    return res.status(500).json({ message: "Could not update the article." });
  }
}

// DELETE /api/admin/support/articles/:id
async function deleteArticle(req, res) {
  try {
    if (!isObjectId(req.params.id)) return bad(res, "Invalid article id.");
    await HelpArticle.findByIdAndDelete(req.params.id);
    return res.json({ message: "Article deleted." });
  } catch (err) {
    console.error("[support-admin] deleteArticle error:", err);
    return res.status(500).json({ message: "Could not delete the article." });
  }
}

module.exports = { getStats, listTickets, updateTicketStatus, replyToTicket, adminListArticles, createArticle, updateArticle, deleteArticle };
