const crypto = require("crypto");
const SupportTicket = require("../models/SupportTicket");
const { TOPICS } = require("../utils/supportConstants");
const { clean, oneLine, isEmail } = require("../utils/supportValidation");
const { notifyTeamNewTicket, confirmTicketToCustomer, notifyTeamCustomerReply } = require("../utils/supportMail");

const TICKET_ID_RE = /^QM-[A-F0-9]{8}$/;
const NOT_FOUND = { message: "We couldn't find a ticket with that ID and email." };
const newTicketId = () => `QM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

// What a customer is allowed to see: never the ip, user agent or internal fields.
const publicView = (t) => ({
  ticketId: t.ticketId, subject: t.subject, topic: t.topic, status: t.status, message: t.message, createdAt: t.createdAt,
  replies: t.replies.map((r) => ({ by: r.by, message: r.message, at: r.at })),
});

function readRef(body) {
  const ticketId = clean(body.ticketId).toUpperCase();
  const email = clean(body.email).toLowerCase();
  return TICKET_ID_RE.test(ticketId) && isEmail(email) ? { ticketId, email } : null;
}

// POST /api/contact   (public)
async function createTicket(req, res) {
  try {
    const b = req.body || {};
    const data = {
      name: clean(b.name), email: clean(b.email).toLowerCase(), phone: clean(b.phone),
      topic: clean(b.topic), subject: oneLine(b.subject), message: clean(b.message),
    };
    const errors = {};
    if (data.name.length < 2 || data.name.length > 80) errors.name = "Enter your name.";
    if (!isEmail(data.email)) errors.email = "Enter a valid email address.";
    if (data.phone && !/^[+\d\s()-]{1,25}$/.test(data.phone)) errors.phone = "Use digits, spaces, + or - only.";
    if (!TOPICS.includes(data.topic)) errors.topic = "Choose a topic.";
    if (data.subject.length < 3 || data.subject.length > 120) errors.subject = "Add a short subject.";
    if (data.message.length < 10 || data.message.length > 3000) errors.message = "Tell us a bit more (at least 10 characters).";
    if (Object.keys(errors).length) return res.status(400).json({ message: Object.values(errors)[0], errors });

    // Honeypot: real people never fill this hidden field. Pretend it worked, save nothing.
    if (clean(b.website)) return res.status(201).json({ ticketId: newTicketId() });

    let ticket = null;
    for (let i = 0; i < 3 && !ticket; i++) {
      try {
        ticket = await SupportTicket.create({
          ...data, phone: data.phone || undefined, ticketId: newTicketId(),
          ip: req.ip, userAgent: (req.get("user-agent") || "").slice(0, 200),
        });
      } catch (e) { if (e.code !== 11000) throw e; }
    }
    if (!ticket) throw new Error("Could not generate a ticket ID");

    // Fire and forget: emails must never block or break the response.
    notifyTeamNewTicket(ticket);
    confirmTicketToCustomer(ticket);

    return res.status(201).json({ ticketId: ticket.ticketId });
  } catch (err) {
    console.error("[contact] createTicket error:", err);
    return res.status(500).json({ message: "Could not send your message. Please try again." });
  }
}

// POST /api/contact/track  body: { ticketId, email }   (POST so the email never lands in URLs or logs)
async function trackTicket(req, res) {
  try {
    const ref = readRef(req.body || {});
    if (!ref) return res.status(404).json(NOT_FOUND);
    const ticket = await SupportTicket.findOne(ref).lean();
    if (!ticket) return res.status(404).json(NOT_FOUND);
    return res.json(publicView(ticket));
  } catch (err) {
    console.error("[contact] trackTicket error:", err);
    return res.status(500).json({ message: "Could not look up your ticket." });
  }
}

// POST /api/contact/reply  body: { ticketId, email, message }
async function customerReply(req, res) {
  try {
    const ref = readRef(req.body || {});
    const message = clean((req.body || {}).message);
    if (!ref) return res.status(404).json(NOT_FOUND);
    if (message.length < 2 || message.length > 3000) return res.status(400).json({ message: "Write a reply of at least 2 characters." });
    const ticket = await SupportTicket.findOneAndUpdate(
      ref, { $push: { replies: { by: "customer", message } }, $set: { status: "open" } }, { new: true }
    ).lean();
    if (!ticket) return res.status(404).json(NOT_FOUND);
    notifyTeamCustomerReply(ticket, message);
    return res.json(publicView(ticket));
  } catch (err) {
    console.error("[contact] customerReply error:", err);
    return res.status(500).json({ message: "Could not send your reply." });
  }
}

module.exports = { createTicket, trackTicket, customerReply };
