const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const ChatRoom = require("./models/ChatRoom");
const { persistMessage } = require("./controllers/chatController");

function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Auth middleware — reuses the same httpOnly JWT cookie as the REST API,
  // so logging in once covers both.
  io.use(async (socket, next) => {
    try {
      const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[cookieName];
      if (!token) return next(new Error("Not authenticated"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error("Not authenticated"));

      socket.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    // Personal room so we can push things (e.g. "user X is now online") to a
    // user regardless of which chat room they currently have open.
    socket.join(`user:${socket.userId}`);

    socket.on("join_room", async (roomId) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.some((p) => String(p) === socket.userId)) return;
        socket.join(String(roomId));
      } catch (err) {
        console.error("[socket] join_room error:", err.message);
      }
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(String(roomId));
    });

    socket.on("send_message", async ({ roomId, content, attachmentUrl }, ack) => {
      try {
        const message = await persistMessage({
          roomId,
          senderId: socket.userId,
          content,
          attachmentUrl,
        });
        io.to(String(roomId)).emit("new_message", message);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: err.message });
      }
    });

    socket.on("typing", ({ roomId, isTyping }) => {
      socket.to(String(roomId)).emit("typing", { roomId, userId: socket.userId, isTyping: !!isTyping });
    });
  });

  return io;
}

module.exports = { initSocket };
