const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// Set REQUIRE_JTI=true once your login always issues a jti, so every token
// goes through the session revocation check. Leave unset until then, or
// existing sessions will be logged out.
const REQUIRE_JTI = process.env.REQUIRE_JTI === "true";

function extractToken(req, { allowHeader }) {
  const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
  if (req.cookies?.[cookieName]) return req.cookies[cookieName];
  if (allowHeader && req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}

/**
 * Verifies the token, checks the session hasn't been revoked, and loads the user.
 * Returns { user, jti } or null if the session isn't valid.
 */
async function authenticate(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

  if (!decoded.jti) {
    if (REQUIRE_JTI) return null;
  } else {
    // A valid signature alone isn't enough: logout / forced logout works by
    // revoking the Session row, so it must exist and be unrevoked.
    const session = await Session.findOne({ jti: decoded.jti, user: decoded.id });
    if (!session || session.revokedAt) return null;

    // Throttled so this isn't a DB write on every request
    if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      session.lastSeenAt = new Date();
      session.save().catch(() => {});
    }
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) return null;
  return { user, jti: decoded.jti };
}

/** Requires a valid session. Attaches the full user doc (minus secrets) to req.user */
async function protect(req, res, next) {
  try {
    const token = extractToken(req, { allowHeader: true });
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }
    const auth = await authenticate(token);
    if (!auth) {
      return res.status(401).json({ message: "Session invalid or signed out. Please log in again." });
    }
    req.user = auth.user;
    if (auth.jti) req.sessionJti = auth.jti;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

/**
 * Restrict a route to one or more roles, e.g. requireRole("admin").
 * "admin" is granted ONLY by the isAdmin flag, never by activeRole, so a
 * user who manages to set activeRole: "admin" still gets nothing.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated." });
    const allowed = roles.some((r) =>
      r === "admin" ? req.user.isAdmin === true : req.user.activeRole === r
    );
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to do that." });
    }
    next();
  };
}

/** Like protect, but never fails: attaches req.user if a valid session exists. */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req, { allowHeader: false });
    if (token) {
      const auth = await authenticate(token);
      if (auth) {
        req.user = auth.user;
        if (auth.jti) req.sessionJti = auth.jti;
      }
    }
  } catch (err) {
    // ignore: treated as logged out
  }
  next();
}

module.exports = { protect, requireRole, optionalAuth };