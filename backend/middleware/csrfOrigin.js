const rawOrigins = (process.env.CLIENT_URL || "").split(",").map((value) => value.trim()).filter(Boolean);

const allowedOrigins = new Set(
  rawOrigins.map((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch { throw new Error(`[security] Invalid CLIENT_URL origin: ${origin}`); }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`[security] CLIENT_URL must use HTTP or HTTPS: ${origin}`);
    } return parsed.origin;
  })
);

if (allowedOrigins.size === 0) {
  console.warn("[security] CLIENT_URL is empty. Browser requests from other origins will not be allowed.");
}
const corsOptions = {
  origin(origin, callback) {
    if (!origin) { return callback(null, true); }
    if (allowedOrigins.has(origin)) { return callback(null, true); }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token",],
};

// CSRF Origin validation.
function csrfOrigin(req, res, next) {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(req.method)) { return next(); }
  if (req.path.startsWith("/payments/webhook/")) { return next(); }
  const origin = req.get("Origin");
  if (!origin) { return next(); }
  if (!allowedOrigins.has(origin)) { return res.status(403).json({ message: "Request origin is not allowed.", }); }
  return next();
}

module.exports = {
  csrfOrigin,
  corsOptions,
  allowedOrigins,
};
