const crypto = require("crypto");

const BASE_URL = "https://api.paystack.co";
const REQUEST_TIMEOUT_MS = 15000;

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Shared fetch wrapper: checks the key, adds a timeout, always returns parsed JSON. */
async function request(path, options = {}) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not set.");
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
      return { status: false, message: `Paystack returned an unreadable response (HTTP ${res.status}).` };
    }
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Paystack request timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * List of Nigerian banks Paystack supports, used to populate the bank
 * dropdown when a provider adds their payout account.
 * https://paystack.com/docs/api/miscellaneous/#bank
 */
async function listBanks() {
  const data = await request("/bank?country=nigeria&perPage=100");
  if (!data.status) throw new Error(data.message || "Could not fetch bank list.");
  return data.data; // [{ name, code, ... }]
}

/**
 * Confirms an account number belongs to the account name before you save it.
 * https://paystack.com/docs/api/verification/#resolve-account
 */
async function resolveAccountNumber(accountNumber, bankCode) {
  const data = await request(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
  if (!data.status) throw new Error(data.message || "Could not verify account number.");
  return data.data; // { account_number, account_name }
}

/**
 * Creates a Paystack Subaccount for a provider so future transactions can
 * auto-split between the provider and the platform.
 * https://paystack.com/docs/api/subaccount/#create
 */
async function createSubaccount({ businessName, bankCode, accountNumber, platformFeePercent }) {
  const data = await request("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode, // Paystack's field name (was incorrectly "bank_code")
      account_number: accountNumber,
      // Percentage Paystack keeps for the MAIN account (the platform) on
      // every split transaction, i.e. the platform fee.
      percentage_charge: platformFeePercent,
    }),
  });
  if (!data.status) throw new Error(data.message || "Could not create payout account.");
  return data.data; // { subaccount_code, ... }
}

/**
 * Starts a transaction. For booking payments, pass `subaccountCode` so
 * Paystack auto-splits the payment at settlement: the provider gets
 * (100 - platformFeePercent)% and the platform keeps the rest. For slot
 * purchases / recommendation fees, omit subaccountCode: 100% goes to the
 * platform's main account.
 * https://paystack.com/docs/api/transaction/#initialize
 */
async function initializeTransaction({ email, amountNaira, reference, callbackUrl, subaccountCode, metadata, currency = "NGN" }) {
  const payload = {
    email,
    amount: Math.round(amountNaira * 100), // Paystack expects kobo
    currency,
    reference,
    callback_url: callbackUrl,
    metadata,
  };
  if (subaccountCode) {
    payload.subaccount = subaccountCode;
    // Who pays Paystack's own processing fee: "subaccount" = the provider,
    // "account" = the platform. (The field is `bearer`; the old `bearer_type`
    // isn't a valid parameter and was silently ignored.)
    payload.bearer = "subaccount";
  }
  const data = await request("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data.status) throw new Error(data.message || "Could not start payment.");
  return data.data; // { authorization_url, access_code, reference }
}

/**
 * Confirms a transaction's real status directly from Paystack. Always do
 * this server-side rather than trusting the frontend redirect alone.
 * Returns { status: "not_found" } if Paystack has no record of the reference
 * yet (e.g. the customer never reached checkout), instead of throwing.
 * https://paystack.com/docs/api/transaction/#verify
 */
async function verifyTransaction(reference) {
  const data = await request(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!data.status) {
    if (/not found/i.test(data.message || "")) return { status: "not_found", reference };
    throw new Error(data.message || "Could not verify transaction.");
  }
  return data.data; // { status: 'success' | ..., amount (kobo), currency, reference, metadata, ... }
}

/**
 * Verifies the `x-paystack-signature` header on incoming webhooks. The
 * signature is an HMAC SHA512 of the RAW request body using your secret key.
 */

/** Charge a previously authorized reusable payment method for a renewal. */
async function chargeAuthorization({ authorizationCode, email, amountKobo, reference, metadata, currency = "NGN" }) {
  const data = await request("/transaction/charge_authorization", {
    method: "POST",
    body: JSON.stringify({
      authorization_code: authorizationCode,
      email,
      amount: String(amountKobo),
      currency,
      reference,
      metadata,
      queue: true,
    }),
  });
  if (!data.status) throw new Error(data.message || "Could not charge saved authorization.");
  return data.data;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!rawBody || !signatureHeader || !secret) return false;

  const expected = Buffer.from(crypto.createHmac("sha512", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(String(signatureHeader));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = {
  listBanks,
  resolveAccountNumber,
  createSubaccount,
  initializeTransaction,
  verifyTransaction,
  chargeAuthorization,
  verifyWebhookSignature,
};