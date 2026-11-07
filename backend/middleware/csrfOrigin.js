const allowedOrigins = new Set((process.env.CLIENT_URL || "").split(",").map((v) => {
  try { return new URL(v.trim()).origin; } catch { return null; }
}).filter(Boolean));

// SameSite=None is required for the Vercel frontend calling the Render API.
// Therefore enforce the browser Origin on all state-changing API requests.
function csrfOrigin(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (req.path.startsWith("/payments/webhook/")) return next(); // gateway HMAC is the control
  const origin = req.get("origin");
  if (!origin) return next(); // server-to-server clients; cookie-auth browser calls always carry Origin
  if (!allowedOrigins.has(origin)) return res.status(403).json({ message: "Request origin is not allowed." });
  next();
}
module.exports = csrfOrigin;
