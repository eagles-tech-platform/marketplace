const Notification = require("../models/Notification");

/**
 * Creates a notification for a user. Never throws — a failed notification
 * should never break the calling action (e.g. don't fail a booking because
 * the notification insert failed).
 */
async function notify({ userId, type, title, message = "", link = "" }) {
  try {
    await Notification.create({ user: userId, type, title, message, link });
  } catch (err) {
    console.error("[notify] Failed to create notification:", err.message);
  }
}

module.exports = { notify };
