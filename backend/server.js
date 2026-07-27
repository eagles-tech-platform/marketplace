require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");

const authRoutes = require("./routes/authRoutes");
const metaRoutes = require("./routes/metaRoutes");

const app = express();
app.set("trust proxy", 1);
const httpServer = http.createServer(app);

connectDB();
initSocket(httpServer);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  express.json({
    // Needed so the Paystack webhook can verify its HMAC signature against
    // the exact raw bytes Paystack sent — the parsed JSON object won't
    // reproduce the same signature. See routes/paymentRoutes.js.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/verification", require("./routes/verificationRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/recommendations", require("./routes/recommendationRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));

// Serves files saved by local-mode uploads (UPLOAD_MODE=local, the default).
// Not used when UPLOAD_MODE=s3 — those URLs point directly at the S3 bucket.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ message: "Internal server error." });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`[server] MARKET PLACE backend (HTTP + Socket.io) running on port ${PORT}`));
