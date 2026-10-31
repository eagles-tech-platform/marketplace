const mongoose = require("mongoose");
const { TOPICS, STATUSES } = require("../utils/supportConstants");

const replySchema = new mongoose.Schema(
  {
    by: { type: String, enum: ["staff", "customer"], required: true },
    message: { type: String, required: true, maxlength: 3000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, maxlength: 25 },
    topic: { type: String, enum: TOPICS, default: "general" },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: STATUSES, default: "open", index: true },
    replies: [replySchema],
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

module.exports = mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);
