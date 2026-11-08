const crypto = require("node:crypto");

/**
 * Validates and loads the JWT signing keyring.
 *
 * Supports multiple signing keys so that key rotation
 * does not immediately invalidate existing access tokens.
 */
function loadKeyring() {
  const raw = process.env.JWT_ACCESS_KEYRING;

  if (!raw) {
    throw new Error("JWT_ACCESS_KEYRING is not configured.");
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JWT_ACCESS_KEYRING must contain valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.current !== "string" ||
    !parsed.current.trim() ||
    !parsed.keys ||
    typeof parsed.keys !== "object" ||
    Array.isArray(parsed.keys)
  ) {
    throw new Error(
      "JWT_ACCESS_KEYRING must contain { current, keys }."
    );
  }

  const keys = new Map();

  for (const [kid, encoded] of Object.entries(parsed.keys)) {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(kid)) {
      throw new Error(`Invalid JWT key identifier: ${kid}`);
    }

    if (typeof encoded !== "string" || !encoded.trim()) {
      throw new Error(`JWT key '${kid}' is missing or invalid.`);
    }

    // Reject malformed Base64 instead of silently accepting it.
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error(`JWT key '${kid}' contains invalid Base64.`);
    }

    const key = Buffer.from(encoded, "base64");

    if (
      key.length < 32 ||
      key.toString("base64").replace(/=+$/, "") !==
        encoded.replace(/=+$/, "")
    ) {
      throw new Error(
        `JWT key '${kid}' must contain at least 32 valid random bytes.`
      );
    }

    keys.set(kid, key);
  }

  if (keys.size === 0) {
    throw new Error("JWT keyring cannot be empty.");
  }

  if (!keys.has(parsed.current)) {
    throw new Error(
      "JWT_ACCESS_KEYRING.current must reference an existing key."
    );
  }

  return {
    currentKid: parsed.current,
    keys
  };
}

/**
 * Retrieves the refresh-token pepper.
 *
 * Minimum: 32 bytes (256 bits).
 */
function getRefreshPepper() {
  const value = process.env.REFRESH_TOKEN_PEPPER;

  if (
    typeof value !== "string" ||
    Buffer.byteLength(value, "utf8") < 32
  ) {
    throw new Error(
      "REFRESH_TOKEN_PEPPER must contain at least 32 bytes."
    );
  }

  return value;
}

/**
 * Generates cryptographically secure secrets.
 *
 * Default: 64 random bytes.
 */
function randomSecretBase64(bytes = 64) {
  if (!Number.isInteger(bytes) || bytes < 32) {
    throw new Error("Secret length must be at least 32 bytes.");
  }

  return crypto.randomBytes(bytes).toString("base64");
}

module.exports = {
  loadKeyring,
  getRefreshPepper,
  randomSecretBase64
};
