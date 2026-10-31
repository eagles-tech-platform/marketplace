// Support emails, built on your existing sendEmail (utils/email.js).
const { sendEmail } = require("./sendEmail");
const { oneLine } = require("./supportValidation");

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const withBreaks = (s) => escapeHtml(s).replace(/\r?\n/g, "<br>");

function frontendUrl() {
  const first = (process.env.SUPPORT_FRONTEND_URL || process.env.CLIENT_URL || "").split(",")[0].trim();
  return first.replace(/\/+$/, "");
}
const trackUrl = () => `${frontendUrl()}/support/track`;
const supportInbox = () => process.env.SUPPORT_INBOX || process.env.SMTP_USER;

function layout({ heading, body, button }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#0f766e;">${escapeHtml(heading)}</h2>
      ${body}
      ${button ? `<p style="text-align:center; margin: 24px 0;"><a href="${escapeHtml(button.url)}" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${escapeHtml(button.label)}</a></p>` : ""}
    </div>`;
}

/** Never throws: a failed email must not break saving a ticket. */
async function safeSend({ to, subject, html, replyTo }) {
  if (!to) return false;
  try {
    await sendEmail({ to, subject: oneLine(subject), html, replyTo });
    return true;
  } catch (err) {
    console.error("[support] email failed:", err.message);
    return false;
  }
}

const notifyTeamNewTicket = (t) =>
  safeSend({
    to: supportInbox(), replyTo: t.email, subject: `[${t.ticketId}] ${t.topic}: ${t.subject}`,
    html: layout({ heading: `New ticket ${t.ticketId}`, body: `<p><b>From:</b> ${escapeHtml(t.name)} (${escapeHtml(t.email)})<br><b>Phone:</b> ${escapeHtml(t.phone || "not given")}<br><b>Topic:</b> ${escapeHtml(t.topic)}</p><p>${withBreaks(t.message)}</p>` }),
  });

const confirmTicketToCustomer = (t) =>
  safeSend({
    to: t.email, subject: `We got your message (${t.ticketId})`,
    html: layout({
      heading: "We got your message",
      body: `<p>Hi ${escapeHtml(t.name)}, thanks for contacting MARKET PLACE. Your ticket ID is <b>${escapeHtml(t.ticketId)}</b>.</p><p>Keep this ID. You'll need it, with this email address, to check progress or reply.</p>`,
      button: { url: trackUrl(), label: "Check ticket status" },
    }),
  });

const notifyTeamCustomerReply = (t, message) =>
  safeSend({
    to: supportInbox(), replyTo: t.email, subject: `[${t.ticketId}] Customer reply`,
    html: layout({ heading: `Reply on ${t.ticketId}`, body: `<p><b>${escapeHtml(t.name)}</b> wrote:</p><p>${withBreaks(message)}</p>` }),
  });

const sendStaffReply = (t, message) =>
  safeSend({
    to: t.email, subject: `Re: ${t.subject} (${t.ticketId})`,
    html: layout({
      heading: "We replied to your ticket",
      body: `<p>Hi ${escapeHtml(t.name)},</p><p>${withBreaks(message)}</p><p style="color:#64748b;font-size:13px;">Ticket ${escapeHtml(t.ticketId)}</p>`,
      button: { url: trackUrl(), label: "View or reply" },
    }),
  });

module.exports = { notifyTeamNewTicket, confirmTicketToCustomer, notifyTeamCustomerReply, sendStaffReply };
