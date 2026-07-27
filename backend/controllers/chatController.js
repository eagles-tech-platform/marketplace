const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");
const User = require("../models/User");
const { notify } = require("../utils/notify");

// GET /api/chat/rooms  — list my conversations, most recent first
async function listRooms(req, res) {
  try {
    const rooms = await ChatRoom.find({ participants: req.user._id })
      .populate("participants", "name avatar activeRole isVerifiedBadge")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // attach unread count per room for this user
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await Message.countDocuments({
          chatRoom: room._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });
        return { ...room.toObject(), unreadCount };
      })
    );

    return res.json({ rooms: roomsWithUnread });
  } catch (err) {
    console.error("[chat] listRooms error:", err);
    return res.status(500).json({ message: "Could not fetch conversations." });
  }
}

// POST /api/chat/rooms  — get-or-create a room with another user
// body: { otherUserId }
async function getOrCreateRoom(req, res) {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: "otherUserId is required." });
    if (String(otherUserId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't chat with yourself." });
    }

    let room = await ChatRoom.findOne({
      participants: { $all: [req.user._id, otherUserId], $size: 2 },
    }).populate("participants", "name avatar activeRole isVerifiedBadge");

    if (!room) {
      room = await ChatRoom.create({ participants: [req.user._id, otherUserId] });
      room = await room.populate("participants", "name avatar activeRole isVerifiedBadge");
    }

    return res.status(200).json({ room });
  } catch (err) {
    console.error("[chat] getOrCreateRoom error:", err);
    return res.status(500).json({ message: "Could not start conversation." });
  }
}

// GET /api/chat/rooms/:id/messages
async function getMessages(req, res) {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Conversation not found." });
    if (!room.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: "You're not part of this conversation." });
    }

    const messages = await Message.find({ chatRoom: room._id }).sort({ createdAt: 1 }).limit(200);

    // mark everything from the other person as read
    await Message.updateMany(
      { chatRoom: room._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.json({ messages });
  } catch (err) {
    console.error("[chat] getMessages error:", err);
    return res.status(500).json({ message: "Could not fetch messages." });
  }
}

/**
 * Shared by the REST send endpoint AND the Socket.io handler so both paths
 * behave identically (persist + notify). Returns the saved message.
 */
async function persistMessage({ roomId, senderId, content, attachmentUrl }) {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new Error("Conversation not found.");
  if (!room.participants.some((p) => String(p) === String(senderId))) {
    throw new Error("You're not part of this conversation.");
  }
  if (!content && !attachmentUrl) {
    throw new Error("Message can't be empty.");
  }

  const message = await Message.create({
    chatRoom: room._id,
    sender: senderId,
    content: content || "",
    attachmentUrl: attachmentUrl || "",
    readBy: [senderId],
  });

  room.lastMessage = content || (attachmentUrl ? "📎 Attachment" : "");
  room.lastMessageAt = new Date();
  await room.save();

  const otherParticipant = room.participants.find((p) => String(p) !== String(senderId));
  if (otherParticipant) {
    const recipient = await User.findById(otherParticipant).select("activeRole");
    const chatPath = recipient?.activeRole === "provider" ? "/provider/chat" : "/dashboard/chat";
    await notify({
      userId: otherParticipant,
      type: "chat",
      title: "New message",
      message: content ? content.slice(0, 80) : "Sent an attachment",
      link: `${chatPath}?room=${room._id}`,
    });
  }

  return message;
}

// POST /api/chat/rooms/:id/messages  — REST fallback (Socket.io is preferred for live delivery)
// body: { content, attachmentUrl }
async function sendMessage(req, res) {
  try {
    const { content, attachmentUrl } = req.body;
    const message = await persistMessage({
      roomId: req.params.id,
      senderId: req.user._id,
      content,
      attachmentUrl,
    });
    return res.status(201).json({ message: "Sent.", data: message });
  } catch (err) {
    console.error("[chat] sendMessage error:", err);
    return res.status(400).json({ message: err.message || "Could not send message." });
  }
}

module.exports = { listRooms, getOrCreateRoom, getMessages, sendMessage, persistMessage };
