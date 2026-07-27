const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../models/Session");

function signToken(userId, jti) {
  return jwt.sign({ id: userId, jti }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Signs a token AND creates the matching Session record (device/IP tracked,
 * revocable independently of the JWT's own expiry). Every login — not just
 * cookie-setting — should go through this so "log out this device" and the
 * security/sessions list stay accurate.
 */
async function sendTokenCookie(res, userId, req) {
  const jti = crypto.randomUUID();
  const token = signToken(userId, jti);

  await Session.create({
    user: userId,
    jti,
    ip: req?.ip || "",
    userAgent: req?.headers?.["user-agent"] || "",
  });

  const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

function clearTokenCookie(res) {
  const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
}

module.exports = { signToken, sendTokenCookie, clearTokenCookie };
