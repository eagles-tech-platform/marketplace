const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { loadKeyring, getRefreshPepper } = require("../config/jwtKeyring");
const RefreshSession = require("../models/RefreshSession");

const REFRESH_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30));
// Window in which a just-rotated token presented again is treated as a benign multi-tab race.
const RACE_GRACE_MS = 10 * 1000;
const COOKIE_NAME = process.env.COOKIE_NAME || "refreshToken";

function hashRefreshToken(token) {
  return crypto
    .createHmac("sha256", getRefreshPepper())
    .update(token)
    .digest("hex");
}

function signAccessToken(user) {
  const { currentKid, keys } = loadKeyring();
  const key = keys.get(currentKid);
  return jwt.sign(
    { sub: String(user._id), role: user.isAdmin ? "admin" : user.activeRole || "customer" },
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

function verifyAccessToken(token) {
  const { keys } = loadKeyring();
  // Pick the key by `kid` from the (unverified) header, but only from our own
  // keyring and only for HS256. The signature is then fully verified below.
  const decoded = jwt.decode(token, { complete: true });
  const header = decoded?.header;
  if (!header || header.alg !== "HS256" || !header.kid || !keys.has(header.kid)) {
    const err = new Error("Unknown or disallowed signing key.");
    err.name = "JsonWebTokenError";
    throw err;
  }
  return jwt.verify(token, keys.get(header.kid), {
    algorithms: ["HS256"],
    issuer: process.env.JWT_ISSUER || "your-api",
    audience: process.env.JWT_AUDIENCE || "your-frontend"
  });
}

function refreshExpiry() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
}

function cookieOptions() {
  const sameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/api/auth",
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
  };
}

async function createRefreshSession(user, req) {
  const rawToken = crypto.randomBytes(64).toString("base64url");
  const tokenHash = hashRefreshToken(rawToken);
  const familyId = crypto.randomUUID();

  await RefreshSession.create({
    userId: user._id,
    tokenHash,
    familyId,
    expiresAt: refreshExpiry(),
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || ""
  });

  return { rawToken, familyId };
}

async function rotateRefreshSession(rawToken, req) {
  const oldHash = hashRefreshToken(rawToken);
  const now = new Date();

  // Atomic consume: only one concurrent request can rotate a given token.
  const oldSession = await RefreshSession.findOneAndUpdate(
    { tokenHash: oldHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
    { new: false }
  ).select("+tokenHash");

  if (!oldSession) {
    // A known, already-consumed token indicates replay. Revoke its whole family.
    const replayed = await RefreshSession.findOne({ tokenHash: oldHash })
      .select("+tokenHash +replacedByHash");
    if (replayed) {
      // Two tabs refreshing at the same instant: the loser presents a token the
      // winner just consumed. The browser's shared cookie jar already holds the
      // winner's new token, so ask the loser to simply retry instead of treating
      // it as theft (which would sign the user out everywhere).
      const age = replayed.revokedAt ? now - replayed.revokedAt : Infinity;
      if (age < RACE_GRACE_MS && (replayed.replacedByHash || age < 2000)) {
        const race = new Error("Refresh already in progress. Retry.");
        race.code = "REFRESH_RACE";
        throw race;
      }
      await RefreshSession.updateMany(
        { familyId: replayed.familyId, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      const error = new Error("Refresh token reuse detected. Please sign in again.");
      error.code = "REFRESH_REUSE";
      throw error;
    }
    const error = new Error("Refresh token is invalid or expired.");
    error.code = "REFRESH_INVALID";
    throw error;
  }

  const user = await mongooseUserLookup(oldSession.userId);
  if (!user || user.disabled === true || user.isActive === false) {
    await RefreshSession.updateMany(
      { familyId: oldSession.familyId, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    const error = new Error("Account is unavailable.");
    error.code = "ACCOUNT_UNAVAILABLE";
    throw error;
  }

  const nextRaw = crypto.randomBytes(64).toString("base64url");
  const nextHash = hashRefreshToken(nextRaw);
  await RefreshSession.create({
    userId: user._id,
    tokenHash: nextHash,
    familyId: oldSession.familyId,
    expiresAt: refreshExpiry(),
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || ""
  });

  await RefreshSession.updateOne(
    { _id: oldSession._id },
    { $set: { replacedByHash: nextHash } }
  );

  return { user, rawToken: nextRaw };
}

// Injected by the controller/router to avoid hard-coding the application's User model.
let findUserById;
function configureUserLookup(fn) { findUserById = fn; }
async function mongooseUserLookup(id) {
  if (!findUserById) throw new Error("Token service user lookup has not been configured.");
  return findUserById(id);
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await RefreshSession.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

async function revokeAllUserSessions(userId) {
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
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
