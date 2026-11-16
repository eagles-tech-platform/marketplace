const CURRENCIES = ["NGN", "USD"];
const INTERVALS = ["monthly", "quarterly", "annual"];

function envKey(tier, currency, interval) {
  return `SUBSCRIPTION_${String(tier).toUpperCase()}_${currency}_${String(interval).toUpperCase()}`;
}

function getSubscriptionPrice(tier, currency, interval) {
  if (!["basic", "pro"].includes(String(tier).toLowerCase())) return null;
  if (!CURRENCIES.includes(currency) || !INTERVALS.includes(interval)) return null;
  const raw = process.env[envKey(tier, currency, interval)];
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getPricesForTier(tier) {
  const prices = {};
  for (const currency of CURRENCIES) {
    prices[currency] = {};
    for (const interval of INTERVALS) {
      prices[currency][interval] = getSubscriptionPrice(tier, currency, interval);
    }
  }
  return prices;
}

function getConfiguredCurrencies(gateway) {
  const variable = gateway === "paystack"
    ? "PAYSTACK_RECURRING_CURRENCIES"
    : "FLUTTERWAVE_SUBSCRIPTION_CURRENCIES";
  const fallback = "NGN";
  return (process.env[variable] || fallback)
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => CURRENCIES.includes(value));
}

module.exports = { CURRENCIES, INTERVALS, envKey, getSubscriptionPrice, getPricesForTier, getConfiguredCurrencies };
