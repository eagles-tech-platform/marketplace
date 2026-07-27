const Feedback = require("../models/Feedback");
const { notify } = require("../utils/notify");

// POST /api/feedback  (any authenticated user)
async function createFeedback(req, res) {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "Subject and message are required." });

    const feedback = await Feedback.create({ user: req.user._id, subject, message });
    return res.status(201).json({ message: "Feedback submitted. We'll get back to you.", feedback });
  } catch (err) {
    console.error("[feedback] createFeedback error:", err);
    return res.status(500).json({ message: "Could not submit feedback." });
  }
}

// GET /api/feedback/mine  (the submitter — to see status/reply)
async function getMyFeedback(req, res) {
  try {
    const feedback = await Feedback.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ feedback });
  } catch (err) {
    console.error("[feedback] getMyFeedback error:", err);
    return res.status(500).json({ message: "Could not fetch your feedback." });
  }
}

// GET /api/feedback  (admin) — optional ?status=
async function listFeedback(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const feedback = await Feedback.find(filter).populate("user", "name email avatar").sort({ createdAt: -1 });
    return res.json({ feedback });
  } catch (err) {
    console.error("[feedback] listFeedback error:", err);
    return res.status(500).json({ message: "Could not fetch feedback." });
  }
}

// PATCH /api/feedback/:id/reply  (admin)
async function replyToFeedback(req, res) {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ message: "Reply can't be empty." });

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });

    feedback.adminReply = reply.trim();
    feedback.status = "replied";
    await feedback.save();

    await notify({
      userId: feedback.user,
      type: "feedback",
      title: "We replied to your feedback",
      message: reply.trim().slice(0, 80),
      link: "/dashboard/settings",
    });

    return res.json({ message: "Reply posted.", feedback });
  } catch (err) {
    console.error("[feedback] replyToFeedback error:", err);
    return res.status(500).json({ message: "Could not post reply." });
  }
}

// PATCH /api/feedback/:id/close  (admin)
async function closeFeedback(req, res) {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status: "closed" }, { new: true });
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });
    return res.json({ message: "Marked as closed.", feedback });
  } catch (err) {
    console.error("[feedback] closeFeedback error:", err);
    return res.status(500).json({ message: "Could not update feedback." });
  }
}

module.exports = { createFeedback, getMyFeedback, listFeedback, replyToFeedback, closeFeedback };
