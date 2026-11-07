const crypto = require("crypto");

function encryptionKey() {
  const raw = process.env.SUBSCRIPTION_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("SUBSCRIPTION_TOKEN_ENCRYPTION_KEY is required for Paystack recurring billing.");
  let key;
  try { key = Buffer.from(raw, "base64"); } catch { key = Buffer.alloc(0); }
  if (key.length !== 32) {
    try { key = Buffer.from(raw, "hex"); } catch { key = Buffer.alloc(0); }
  }
  if (key.length !== 32) throw new Error("SUBSCRIPTION_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or hex value.");
  return key;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return { authorizationCiphertext: ciphertext.toString("base64"), authorizationIv: iv.toString("base64"), authorizationTag: cipher.getAuthTag().toString("base64") };
}

function decryptSecret(record) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.authorizationIv, "base64"));
  decipher.setAuthTag(Buffer.from(record.authorizationTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(record.authorizationCiphertext, "base64")), decipher.final()]).toString("utf8");
}

module.exports = { encryptSecret, decryptSecret };
