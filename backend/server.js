require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const {
  csrfOrigin,
  corsOptions,
  allowedOrigins,
} = require("./middleware/csrfOrigin");
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

if (
  !PORT ||
  !/^\d+$/.test(PORT) ||
  Number(PORT) < 1 ||
  Number(PORT) > 65535
) { throw new Error("PORT must be provided by the deployment platform or defined in .env.") }
if (process.env.NODE_ENV === "production" && allowedOrigins.size === 0) {
  throw new Error(
    "CLIENT_URL must contain at least one allowed frontend origin in production."
  );
}

// --------------------------------------------------
// Security middleware
// --------------------------------------------------

// crossOriginResourcePolicy "cross-origin" lets your frontend display uploaded images
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use("/api", csrfOrigin); // Origin must match CLIENT_URL on state-changing requests

// rawBody is needed for Paystack webhook signature verification
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "1mb" })); // extended:true allows nested operator objects like a[$ne]=x
app.use(cookieParser());

// --------------------------------------------------
// Rate limiting
// --------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
  // Payment gateways must not be throttled by this API limiter.
  skip: (req) => req.path.startsWith("/payments/webhook/"),
});

// Failed authentication attempts only.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

app.use("/api", apiLimiter);

// --------------------------------------------------
// Routes
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authLimiter, authRoutes);
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
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large." });
  }
  console.error("[server] Unhandled error:", err);
  return res.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  try {
    await connectDB();
    initSocket(httpServer);

    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log("----------------------------------------");
      console.log("[server] Quantum Marketplace API started");
      console.log(`[server] Port: ${PORT}`);
      console.log(
        `[server] Environment: ${process.env.NODE_ENV || "development"}`
      );
      console.log(
        `[server] Allowed origins: ${[...allowedOrigins].join(", ") || "(none configured)"
        }`
      );
      console.log("[server] CORS credentials: enabled");
      console.log("[server] CSRF origin validation: enabled");
      console.log("----------------------------------------");
    });
  } catch (error) {
    console.error("[server] Startup failed:", error);
    process.exit(1);
  }
}

startServer();
