const crypto = require("node:crypto");
const kid = new Date().toISOString().slice(0, 7).replace("-", "");
const access = crypto.randomBytes(64).toString("base64");
const pepper = crypto.randomBytes(64).toString("base64");
console.log("\nJWT_ACCESS_KEYRING=" + JSON.stringify({ current: kid, keys: { [kid]: access } }));
console.log("REFRESH_TOKEN_PEPPER=" + pepper);
console.log("\nCopy these values into your secret manager / Render Environment Variables.");
console.log("Do not commit generated values to Git or expose them to the browser.");
