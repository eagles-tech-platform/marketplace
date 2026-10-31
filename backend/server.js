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
const httpServer = http.createServer(app);

// --------------------------------------------------
// Environment configuration
// --------------------------------------------------

app.set("trust proxy", 1);
const PORT = process.env.PORT;

if (!PORT || !/^\d+$/.test(PORT) || Number(PORT) < 1 || Number(PORT) > 65535) {
  throw new Error(
    "PORT must be provided by the deployment platform or defined in .env."
  );
}

// CLIENT_URL supports multiple comma-separated frontend origins.
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean)
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      throw new Error(`Invalid CLIENT_URL origin: ${origin}`);
    }
  });

if (allowedOrigins.length === 0) {
  console.warn(
    "[server] CLIENT_URL is not configured. Browser requests from other origins will not be allowed."
  );
}

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header, such as server-to-server calls.
    if (!origin) return callback(null, true);
  
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => { res.status(200).json({ status: "ok", time: new Date().toISOString(), }) });

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
app.use("/api/help", require("./routes/helpRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));

// Serves files saved by local-mode uploads (UPLOAD_MODE=local, the default).
// Not used when UPLOAD_MODE=s3 — those URLs point directly at the S3 bucket.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ message: "Internal server error.", });
});

async function startServer() {
  try {
    await connectDB();
    initSocket(httpServer);

    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log(
        `[server] Marketplace backend running on port ${PORT}`
      );
      console.log(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`[server] Allowed frontend origins: ${
        allowedOrigins.join(", ") || "(none configured)"
      }`);
    });
  } catch (error) {
    console.error("[server] Startup failed:", error);
    process.exit(1);
  }
}

startServer();
