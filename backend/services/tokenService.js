const crypto = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { loadKeyring, getRefreshPepper } = require("../config/jwtKeyring");
const RefreshSession = require("../models/RefreshSession");

const COOKIE_NAME = process.env.COOKIE_NAME || "refreshToken";

function getRefreshDays() {
  const value = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error("REFRESH_TOKEN_TTL_DAYS must be an integer between 1 and 365.");
  }
  return value;
}

/**
 * Hashes refresh tokens using HMAC-SHA256.
 */
function hashRefreshToken(token) {
  if (typeof token !== "string" || !token) { throw new Error("A valid refresh token is required."); }
  return crypto.createHmac("sha256", getRefreshPepper()).update(token, "utf8").digest("hex");
}

/**
 * Signs short-lived access tokens.
 */
function signAccessToken(user) {
  if (!user || !user._id) {
    throw new Error("A valid user is required to sign an access token.");
  }
  const { currentKid, keys } = loadKeyring();
  const key = keys.get(currentKid);
  const role = user.isAdmin ? "admin" : user.activeRole || "customer";
  return jwt.sign(
    { sub: String(user._id), role },
    key,
    {
      algorithm: "HS256",
      keyid: currentKid,
      expiresIn: process.env.JWT_ACCESS_TTL || "15m",
      issuer: process.env.JWT_ISSUER || "your-api",
      audience: process.env.JWT_AUDIENCE || "your-frontend"
    }
  );
}

/**
 * Verifies access tokens using only trusted keys.
 */
function verifyAccessToken(token) {
  if (typeof token !== "string" || !token) { throw new Error("Access token is required."); }
  const { keys } = loadKeyring();
  const decoded = jwt.decode(token, { complete: true });
  const header = decoded?.header;
  if (!header || header.alg !== "HS256" || typeof header.kid !== "string" || !keys.has(header.kid)) {
    const error = new Error("Unknown or disallowed signing key.");
    error.name = "JsonWebTokenError";
    throw error;
  }
  return jwt.verify(token, keys.get(header.kid), {
    algorithms: ["HS256"],
    issuer: process.env.JWT_ISSUER || "your-api",
    audience: process.env.JWT_AUDIENCE || "your-frontend"
  });
}

/**
 * Calculates refresh-token expiry.
 */
function refreshExpiry() {
  const days = getRefreshDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Cookie settings.
 */
function cookieOptions() {
  const sameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  if (!["strict", "lax", "none"].includes(sameSite)) { throw new Error("Invalid COOKIE_SAME_SITE configuration."); }
  const production = process.env.NODE_ENV === "production";
  if (sameSite === "none" && !production) {
    throw new Error("SameSite=None requires secure cookies in production.");
  }
  return {
    httpOnly: true,
    secure: production || sameSite === "none",
    sameSite,
    path: "/api/auth",
    maxAge: getRefreshDays() * 24 * 60 * 60 * 1000
  };
}

/**
 * Creates a new refresh-token session.
 */
async function createRefreshSession(user, req) {
  if (!user || !user._id) { throw new Error("A valid user is required."); }
  const rawToken = crypto.randomBytes(64).toString("base64url");
  const tokenHash = hashRefreshToken(rawToken);
  const familyId = crypto.randomUUID();
  await RefreshSession.create({
    userId: user._id,
    tokenHash,
    familyId,
    expiresAt: refreshExpiry(),
    revokedAt: null,
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || ""
  });

  return { rawToken, familyId };
}

/**
 * User lookup is injected by the authentication controller.
 */
let findUserById;
function configureUserLookup(fn) {
  if (typeof fn !== "function") { throw new Error("User lookup must be a function."); }
  findUserById = fn;
}

async function mongooseUserLookup(id, options = {}) {
  if (!findUserById) {
    throw new Error("Token service user lookup has not been configured.");
  }
  return findUserById(id, options);
}

/**
 * Rotates a refresh token transactionally.
 *
 * Requires MongoDB transaction support.
 * A replica set or sharded cluster is required.
 */
async function rotateRefreshSession(rawToken, req) {
  if (typeof rawToken !== "string" || rawToken.length < 20 || rawToken.length > 512) {
    const error = new Error("Invalid refresh token.");
    error.code = "REFRESH_INVALID";
    throw error;
  }
  const oldHash = hashRefreshToken(rawToken);
  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      result = null;
      const now = new Date();
      // Atomically consume the existing refresh token.
      const oldSession = await RefreshSession.findOneAndUpdate(
        { tokenHash: oldHash, revokedAt: null, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { new: false, session }
      ).select("+tokenHash");
      if (!oldSession) {
        result = { type: "missing" }; return;
      }
      const user = await mongooseUserLookup(oldSession.userId, { session });

      if (!user || user.disabled === true || user.isActive === false) {
        await RefreshSession.updateMany(
          { familyId: oldSession.familyId, revokedAt: null },
          { $set: { revokedAt: now } },
          { session }
        );
        result = { type: "unavailable" };
        return;
      }
      const nextRaw = crypto.randomBytes(64).toString("base64url");
      const nextHash = hashRefreshToken(nextRaw);
      // Create the replacement within the same transaction.
      await RefreshSession.create(
        [
          {
            userId: user._id,
            tokenHash: nextHash,
            familyId: oldSession.familyId,
            expiresAt: refreshExpiry(),
            revokedAt: null,
            userAgent: req.get("user-agent") || "",
            ipAddress: req.ip || ""
          }
        ], { session }
      );
      await RefreshSession.updateOne(
        { _id: oldSession._id },
        { $set: { replacedByHash: nextHash } },
        { session }
      );
      result = { type: "success", user, rawToken: nextRaw, accessToken: signAccessToken(user) };
    });
  } finally {
    await session.endSession();
  }
  if (result?.type === "unavailable") {
    const error = new Error("Account is unavailable.");
    error.code = "ACCOUNT_UNAVAILABLE";
    throw error;
  }
  if (result?.type === "missing") {
    const replayed = await RefreshSession.findOne({
      tokenHash: oldHash
    }).select("+tokenHash");
    if (replayed && replayed.revokedAt) {
      await RefreshSession.updateMany(
        { familyId: replayed.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      const error = new Error("Refresh token reuse detected. Please sign in again.");
      error.code = "REFRESH_REUSE";
      throw error;
    }
    const error = new Error("Refresh token is invalid or expired.");
    error.code = "REFRESH_INVALID";
    throw error;
  }
  if (!result || result.type !== "success") {
    throw new Error("Refresh token rotation failed.");
  }
return { user: result.user, rawToken: result.rawToken,  accessToken: result.accessToken };
}

/**
 * Revokes one refresh token.
 */
async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await RefreshSession.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/**
 * Revokes all active sessions belonging to a user.
 */
async function revokeAllUserSessions(userId) {
  if (!userId) { throw new Error("User ID is required."); }
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

module.exports = {
  COOKIE_NAME,
  hashRefreshToken,
  cookieOptions,
  signAccessToken,
  verifyAccessToken,
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshToken,
  revokeAllUserSessions,
  configureUserLookup
};
