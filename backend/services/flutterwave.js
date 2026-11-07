const crypto = require("crypto");
const { PLATFORM_FEE_PERCENT } = require("../config/paymentConfig");

const BASE_URL = "https://api.flutterwave.com/v3";
const REQUEST_TIMEOUT_MS = 15000;

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Shared fetch wrapper: checks the key, adds a timeout, always returns parsed JSON. */
async function request(path, options = {}) {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not set.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: authHeaders(),
      signal: controller.signal,
    });
    try {
      return await res.json();
    } catch {
      return { status: "error", message: `Flutterwave returned an unreadable response (HTTP ${res.status}).` };
    }
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Flutterwave request timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * List of banks for the dropdown when a provider adds their payout account.
 * https://developer.flutterwave.com/reference/endpoints/banks
 */
async function listBanks() {
  const data = await request("/banks/NG");
  if (data.status !== "success") throw new Error(data.message || "Could not fetch bank list.");
  return data.data; // [{ id, code, name }]
}

/**
 * Confirms an account number/name before saving it.
 * https://developer.flutterwave.com/reference/endpoints/resolve-account-number
 */
async function resolveAccountNumber(accountNumber, bankCode) {
  const data = await request("/accounts/resolve", {
    method: "POST",
    body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
  });
  if (data.status !== "success") throw new Error(data.message || "Could not verify account number.");
  return data.data; // { account_number, account_name }
}

/**
 * Creates a Flutterwave Subaccount so transactions can auto-split between
 * the provider and the platform.
 * https://developer.flutterwave.com/reference/endpoints/subaccounts
 */
async function createSubaccount({ businessName, bankCode, accountNumber, platformFeePercent, email }) {
  const data = await request("/subaccounts", {
    method: "POST",
    body: JSON.stringify({
      account_bank: bankCode,
      account_number: accountNumber,
      business_name: businessName,
      business_email: email,
      country: "NG",
      split_type: "percentage",
      // Default split stored on the subaccount. The real platform fee is also
      // set explicitly per transaction in initializeTransaction, so it is
      // applied consistently whatever this default is.
      split_value: (100 - platformFeePercent) / 100,
    }),
  });
  if (data.status !== "success") throw new Error(data.message || "Could not create payout account.");
  return data.data; // { id, subaccount_id: "RS_...", ... }
}

/**
 * Starts a payment. For booking payments, pass `subaccountId` (the
 * "RS_..." subaccount_id) so Flutterwave auto-splits at settlement.
 * https://developer.flutterwave.com/reference/endpoints/standard
 */
async function initializeTransaction({
  email,
  name,
  amountNaira,
  reference,
  redirectUrl,
  subaccountId,
  meta,
  currency = "NGN",
  paymentPlanId,
  platformFeePercent = PLATFORM_FEE_PERCENT,
}) {
  const payload = {
    tx_ref: reference,
    amount: amountNaira,
    currency,
    redirect_url: redirectUrl,
    customer: { email, name },
    meta,
  };
  if (paymentPlanId) {
    payload.payment_plan = Number(paymentPlanId);
    payload.payment_options = "card";
  }
  if (subaccountId) {
    payload.subaccounts = [
      {
        id: subaccountId,
        // Platform's cut of this transaction, as a fraction (0.5% -> 0.005)
        transaction_charge_type: "percentage",
        transaction_charge: platformFeePercent / 100,
      },
    ];
  }
  const data = await request("/payments", { method: "POST", body: JSON.stringify(payload) });
  if (data.status !== "success") throw new Error(data.message || "Could not start payment.");
  return data.data; // { link }: the hosted checkout URL
}

/**
 * Confirms a transaction's real status directly from Flutterwave, by
 * Flutterwave's own transaction id.
 * https://developer.flutterwave.com/reference/endpoints/transactions
 */
async function verifyTransaction(transactionId) {
  const data = await request(`/transactions/${encodeURIComponent(transactionId)}/verify`);
  if (data.status !== "success") throw new Error(data.message || "Could not verify transaction.");
  return data.data; // { status: 'successful' | ..., amount, currency, tx_ref, meta, ... }
}

/**
 * Confirms a transaction by OUR reference (tx_ref), so no transaction_id has
 * to be carried through the redirect. Returns { status: "not_found" } when
 * Flutterwave has no record yet, instead of throwing.
 */
async function verifyByReference(txRef) {
  const data = await request(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  if (data.status !== "success") {
    if (/no transaction/i.test(data.message || "")) return { status: "not_found", tx_ref: txRef };
    throw new Error(data.message || "Could not verify transaction.");
  }
  return data.data; // { status: 'successful' | ..., amount, currency, tx_ref, ... }
}

/** Create a provider-managed recurring payment plan. */
async function createPaymentPlan({ name, amount, currency, interval }) {
  const data = await request("/payment-plans", {
    method: "POST",
    body: JSON.stringify({ name, amount, currency, interval }),
  });
  if (data.status !== "success" || !data.data?.id) throw new Error(data.message || "Could not create Flutterwave payment plan.");
  return data.data;
}

/** Verify a Flutterwave transaction using the transaction ID in its webhook. */
async function verifyById(transactionId) {
  const data = await request(`/transactions/${encodeURIComponent(String(transactionId))}/verify`);
  if (data.status !== "success" || !data.data) throw new Error(data.message || "Could not verify Flutterwave transaction.");
  return data.data;
}

/** Current Flutterwave webhook signature: HMAC-SHA256(raw body, secret hash), base64. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.FLW_SECRET_HASH || process.env.FLW_WEBHOOK_HASH;
  if (!secret || !rawBody || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  // Backward compatibility with legacy Flutterwave accounts configured for verif-hash.
  const legacy = Buffer.from(secret);
  return legacy.length === b.length && crypto.timingSafeEqual(legacy, b);
}

module.exports = {
  listBanks,
  resolveAccountNumber,
  createSubaccount,
  initializeTransaction,
  verifyTransaction,
  verifyByReference,
  createPaymentPlan,
  verifyById,
  verifyWebhookSignature,
};