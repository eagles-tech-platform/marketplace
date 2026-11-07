const crypto = require("node:crypto");

function loadKeyring() {
  let parsed;
  try {
    parsed = JSON.parse(process.env.JWT_ACCESS_KEYRING || "{}");
  } catch {
    throw new Error("JWT_ACCESS_KEYRING must be valid JSON.");
  }

  if (!parsed.current || !parsed.keys || typeof parsed.keys !== "object") {
    throw new Error("JWT_ACCESS_KEYRING must contain { current, keys }.");
  }

  const keys = new Map();
  for (const [kid, encoded] of Object.entries(parsed.keys)) {
    if (typeof encoded !== "string" || !encoded.trim()) {
      throw new Error(`JWT key '${kid}' is missing or invalid.`);
    }
    const key = Buffer.from(encoded, "base64");
    if (key.length < 32) {
      throw new Error(`JWT key '${kid}' must decode to at least 32 random bytes.`);
    }
    keys.set(kid, key);
  }

  if (!keys.has(parsed.current)) {
    throw new Error("JWT_ACCESS_KEYRING.current must reference a key in keys.");
  }
  return { currentKid: parsed.current, keys };
}

function getRefreshPepper() {
  const value = process.env.REFRESH_TOKEN_PEPPER;
  if (!value || Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("REFRESH_TOKEN_PEPPER must contain at least 32 bytes.");
  }
  return value;
}

function randomSecretBase64() {
  return crypto.randomBytes(64).toString("base64");
}

module.exports = { loadKeyring, getRefreshPepper, randomSecretBase64 };
