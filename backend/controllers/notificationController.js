const Notification = require("../models/Notification");

// GET /api/notifications/mine
async function getMyNotifications(req, res) {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[notifications] getMyNotifications error:", err);
    return res.status(500).json({ message: "Could not fetch notifications." });
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    notification.isRead = true;
    await notification.save();
    return res.json({ message: "Marked as read.", notification });
  } catch (err) {
    console.error("[notifications] markRead error:", err);
    return res.status(500).json({ message: "Could not update notification." });
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("[notifications] markAllRead error:", err);
    return res.status(500).json({ message: "Could not update notifications." });
  }
}

module.exports = { getMyNotifications, markRead, markAllRead };
