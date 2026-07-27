const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMyNotifications, markRead, markAllRead } = require("../controllers/notificationController");

const router = express.Router();

router.get("/mine", protect, getMyNotifications);
router.patch("/:id/read", protect, markRead);
router.patch("/read-all", protect, markAllRead);

module.exports = router;
