const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listRooms, getOrCreateRoom, getMessages, sendMessage } = require("../controllers/chatController");

const router = express.Router();

router.get("/rooms", protect, listRooms);
router.post("/rooms", protect, getOrCreateRoom);
router.get("/rooms/:id/messages", protect, getMessages);
router.post("/rooms/:id/messages", protect, sendMessage);

module.exports = router;
