// Central place for payment behavior so nothing is hardcoded in multiple spots.

const VALID_MODES = ["simulate", "live"];
const isProd = process.env.NODE_ENV === "production";

function resolveMode() {
  const raw = process.env.PAYMENTS_MODE;
  if (raw === undefined || raw.trim() === "") {
    if (isProd) {
      throw new Error("PAYMENTS_MODE must be explicitly set to 'simulate' or 'live' in production.");
    }
    return "simulate"; // safe default for local development only
  }
  const mode = raw.trim().toLowerCase();
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid PAYMENTS_MODE "${raw}". Use 'simulate' or 'live'.`);
  }
  return mode;
}

function resolveFeePercent() {
  const n = Number(process.env.PLATFORM_FEE_PERCENT ?? 0.5);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error("PLATFORM_FEE_PERCENT must be a number between 0 and 100.");
  }
  return n;
}

const PAYMENTS_MODE = resolveMode();
const PLATFORM_FEE_PERCENT = resolveFeePercent();

// CLIENT_URL may hold several comma-separated origins (server.js allows that),
// so use an explicit base URL, or the first origin, for gateway redirects.
const CALLBACK_BASE_URL = (
  process.env.PAYMENT_CALLBACK_BASE_URL || (process.env.CLIENT_URL || "").split(",")[0] || ""
)
  .trim()
  .replace(/\/+$/, "");

if (PAYMENTS_MODE === "live" && !CALLBACK_BASE_URL) {
  throw new Error("Set PAYMENT_CALLBACK_BASE_URL (or CLIENT_URL) for live payments.");
}

if (isProd && PAYMENTS_MODE === "simulate") {
  console.warn("[payments] WARNING: running in SIMULATE mode in production. No real money will move.");
}
console.log(`[payments] mode: ${PAYMENTS_MODE}`);

const isLive = () => PAYMENTS_MODE === "live";

module.exports = { PLATFORM_FEE_PERCENT, PAYMENTS_MODE, CALLBACK_BASE_URL, isLive };