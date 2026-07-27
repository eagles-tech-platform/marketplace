const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");

/** Requires a valid session. Attaches the full user doc (minus secrets) to req.user */
async function protect(req, res, next) {
  try {
    const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
    const token =
      req.cookies?.[cookieName] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Session revocation check — a valid JWT signature alone isn't enough;
    // "log out this device" / admin-forced logout works by revoking the
    // Session row, so it must still exist and be unrevoked on every request.
    if (decoded.jti) {
      const session = await Session.findOne({ jti: decoded.jti, user: decoded.id });
      if (!session || session.revokedAt) {
        return res.status(401).json({ message: "This session has been signed out. Please log in again." });
      }
      session.lastSeenAt = new Date();
      session.save().catch(() => {}); // best-effort, don't block the request on it
      req.sessionJti = decoded.jti;
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Session invalid. Please log in again." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

/** Restrict route to one or more roles, e.g. requireRole("admin") */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated." });
    const effectiveRole = req.user.isAdmin ? "admin" : req.user.activeRole;
    if (!roles.includes(effectiveRole)) {
      return res.status(403).json({ message: "You do not have permission to do that." });
    }
    next();
  };
}

/** Like protect, but never fails — just attaches req.user if a valid session exists. */
async function optionalAuth(req, res, next) {
  try {
    const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
    const token = req.cookies?.[cookieName];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
    next();
  } catch (err) {
    next();
  }
}

module.exports = { protect, requireRole, optionalAuth };
