// middleware/authMiddleware.js

const User = require("../models/User");
const { verifyAccessToken } = require("../services/tokenService");

/**
 * Extracts a Bearer access token.
 *
 * Refresh tokens must never be accepted as access tokens.
 * The refresh token is handled separately by POST /api/auth/refresh
 * through the HttpOnly cookie.
 */
function extractAccessToken(req) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : null;
}

/**
 * Verifies an access token and loads the current Marketplace user.
 *
 * Returns:
 *   { user, claims }
 * or null when the token or account is invalid.
 */
async function authenticateAccessToken(token) {
  const claims = verifyAccessToken(token);

  // New access tokens use `sub` as the user ID.
  // `id` is retained only for a controlled legacy transition.
  const userId = claims.sub || claims.id;

  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  // Check current database account status on every protected request.
  if (user.isActive === false) {
    return null;
  }

  // Marketplace users must verify their email before accessing
  // authenticated account functionality.
  if (user.isEmailVerified === false) {
    return null;
  }

  // Never grant admin access from a JWT role claim.
  // The database user record is authoritative.
  return { user, claims };
}

/**
 * Requires authentication.
 *
 * Attaches:
 *   req.user       - Full Marketplace User document
 *   req.auth       - Verified JWT claims and user ID
 *
 * Existing controllers that use req.user continue to work.
 */
async function protect(req, res, next) {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const auth = await authenticateAccessToken(token);

    if (!auth) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or your account is unavailable.",
        code: "INVALID_SESSION",
      });
    }

    req.user = auth.user;

    req.auth = {
      userId: String(auth.user._id),
      role: auth.user.isAdmin
        ? "admin"
        : auth.user.activeRole || "customer",
      activeRole: auth.user.activeRole || "customer",
      isAdmin: auth.user.isAdmin === true,
      claims: auth.claims,
    };

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.code === "ACCESS_TOKEN_EXPIRED"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your access token has expired. Refresh your session.",
        code: "ACCESS_TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Your access token is invalid.",
        code: "ACCESS_TOKEN_INVALID",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to authenticate this request.",
      code: "AUTHENTICATION_ERROR",
    });
  }
}

/**
 * Restricts access to one or more Marketplace roles.
 *
 * Examples:
 *   requireRole("customer")
 *   requireRole("provider")
 *   requireRole("admin")
 *   requireRole("customer", "provider")
 *
 * Admin access is granted only by the database isAdmin flag.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const allowed = roles.some((role) => {
      if (role === "admin") {
        return req.user.isAdmin === true;
      }

      return req.user.activeRole === role;
    });

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
        code: "FORBIDDEN",
      });
    }

    return next();
  };
}

/**
 * Optional authentication.
 *
 * Invalid, missing or expired access tokens are treated as anonymous.
 * This is suitable for public routes that behave differently for
 * signed-in users.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return next();
    }

    const auth = await authenticateAccessToken(token);

    if (auth) {
      req.user = auth.user;

      req.auth = {
        userId: String(auth.user._id),
        role: auth.user.isAdmin
          ? "admin"
          : auth.user.activeRole || "customer",
        activeRole: auth.user.activeRole || "customer",
        isAdmin: auth.user.isAdmin === true,
        claims: auth.claims,
      };
    }
  } catch {
    // Optional authentication must not block public requests.
  }

  return next();
}

module.exports = {
  protect,
  requireAuth: protect,
  requireRole,
  optionalAuth,
  authenticateAccessToken,
};
