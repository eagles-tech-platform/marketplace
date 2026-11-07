const { Server } = require("socket.io");
const ChatRoom = require("./models/ChatRoom");
const Message = require("./models/Message");
const mongoose = require("mongoose");
const { authenticateAccessToken } = require("./middleware/authMiddleware");
const { persistMessage } = require("./controllers/chatController");

function configuredOrigins() {
  return (process.env.CLIENT_URL || "").split(",").map((v) => v.trim()).filter(Boolean).map((v) => {
    try { return new URL(v).origin; } catch { return null; }
  }).filter(Boolean);
}

function initSocket(httpServer) {
  const origins = configuredOrigins();
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    allowRequest(req, callback) {
      const origin = req.headers.origin;
      callback(null, !origin || origins.includes(origin));
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
  });

  // Authenticate with the short-lived access token (same rules as REST).
  // The client passes it as `auth: { token }` and must reconnect with a fresh
  // token after refreshing its session.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) return next(new Error("Not authenticated"));
      const auth = await authenticateAccessToken(token);
      if (!auth) return next(new Error("Session invalid or signed out"));
      socket.data.token = token;
      socket.data.userId = String(auth.user._id);
      next();
    } catch (err) {
      next(new Error(err.name === "TokenExpiredError" ? "ACCESS_TOKEN_EXPIRED" : "Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    // Re-validate before every client event so a deactivated account or an
    // expired access token can't keep using an already-open socket.
    socket.use(async (packet, next) => {
      // Token hand-over is validated by its own handler below.
      if (packet[0] === "update_token") return next();
      try {
        const auth = await authenticateAccessToken(socket.data.token);
        if (!auth || String(auth.user._id) !== userId) throw new Error("invalid");
        next();
      } catch (err) {
        const expired = err?.name === "TokenExpiredError";
        socket.emit(expired ? "token_expired" : "session_invalid", {
          message: expired
            ? "Access token expired. Refresh your session and reconnect."
            : "Your session has ended. Please sign in again.",
        });
        socket.disconnect(true);
      }
    });

    // The client sends each refreshed access token so the connection survives
    // token rotation without dropping in-flight events.
    socket.on("update_token", async (token) => {
      try {
        if (typeof token !== "string" || !token) throw new Error("invalid");
        const auth = await authenticateAccessToken(token);
        if (!auth || String(auth.user._id) !== userId) throw new Error("invalid");
        socket.data.token = token;
      } catch {
        socket.emit("session_invalid", { message: "Your session has ended. Please sign in again." });
        socket.disconnect(true);
      }
    });

    socket.on("join_room", async (payload, ack) => {
      const roomId = typeof payload === "string" ? payload : payload?.roomId;
      try {
        if (!mongoose.isValidObjectId(roomId)) throw new Error("Invalid conversation.");
        const room = await ChatRoom.findOne({ _id: roomId, participants: userId }).select("_id");
        if (!room) throw new Error("Conversation not found or access denied.");
        await socket.join(String(room._id));
        if (typeof ack === "function") ack({ ok: true, roomId: String(room._id) });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    socket.on("leave_room", async (payload, ack) => {
      const roomId = typeof payload === "string" ? payload : payload?.roomId;
      if (typeof roomId === "string" && mongoose.isValidObjectId(roomId)) await socket.leave(roomId);
      if (typeof ack === "function") ack({ ok: true });
    });

    socket.on("send_message", async (payload = {}, ack) => {
      try {
        const { roomId, content, attachmentUrl } = payload;
        if (!mongoose.isValidObjectId(roomId)) throw new Error("Invalid conversation.");
        if (typeof content !== "string" || content.length > 5000) throw new Error("Message must be 5,000 characters or fewer.");
        if (attachmentUrl !== undefined && (typeof attachmentUrl !== "string" || attachmentUrl.length > 2048)) throw new Error("Invalid attachment URL.");
        const room = await ChatRoom.findOne({ _id: roomId, participants: userId }).select("_id");
        if (!room) throw new Error("Conversation not found or access denied.");
        const message = await persistMessage({ roomId, senderId: userId, content: content.trim(), attachmentUrl });
        io.to(String(roomId)).emit("new_message", message);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message || "Could not send message." });
      }
    });

    socket.on("mark_read", async (payload = {}, ack) => {
      try {
        const { roomId } = payload;
        if (!mongoose.isValidObjectId(roomId)) throw new Error("Invalid conversation.");
        const room = await ChatRoom.findOne({ _id: roomId, participants: userId }).select("_id");
        if (!room) throw new Error("Conversation not found or access denied.");
        const result = await Message.updateMany(
          { chatRoom: roomId, sender: { $ne: userId }, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        socket.to(String(roomId)).emit("read_receipt", { roomId: String(roomId), userId, readAt: new Date() });
        if (typeof ack === "function") ack({ ok: true, modifiedCount: result.modifiedCount });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    socket.on("typing", async (payload = {}) => {
      try {
        const { roomId, isTyping } = payload;
        if (!mongoose.isValidObjectId(roomId)) return;
        const room = await ChatRoom.findOne({ _id: roomId, participants: userId }).select("_id");
        if (!room) return;
        socket.to(String(roomId)).emit("typing", { roomId: String(roomId), userId, isTyping: !!isTyping });
      } catch (err) {
        console.error("[socket] typing event failed:", err.message);
      }
    });
  });

  return io;
}

module.exports = { initSocket };
