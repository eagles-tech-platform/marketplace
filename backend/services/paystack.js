const crypto = require("crypto");

const BASE_URL = "https://api.paystack.co";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * List of Nigerian banks Paystack supports, used to populate the bank
 * dropdown when a provider adds their payout account.
 * https://paystack.com/docs/api/miscellaneous/#bank
 */
async function listBanks() {
  const res = await fetch(`${BASE_URL}/bank?country=nigeria`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Could not fetch bank list.");
  return data.data; // [{ name, code, ... }]
}

/**
 * Confirms an account number belongs to the account name before you save it.
 * https://paystack.com/docs/api/verification/#resolve-account
 */
async function resolveAccountNumber(accountNumber, bankCode) {
  const res = await fetch(
    `${BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Could not verify account number.");
  return data.data; // { account_number, account_name }
}

/**
 * Creates a Paystack Subaccount for a provider so future transactions can
 * auto-split between the provider and the platform.
 * https://paystack.com/docs/api/subaccount/#create
 */
async function createSubaccount({ businessName, bankCode, accountNumber, platformFeePercent }) {
  const res = await fetch(`${BASE_URL}/subaccount`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      business_name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      // This is the percentage Paystack keeps for the MAIN account (the
      // platform) on every split transaction — i.e. the platform fee.
      percentage_charge: platformFeePercent,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Could not create payout account.");
  return data.data; // { subaccount_code, ... }
}

/**
 * Starts a transaction. For booking payments, pass `subaccountCode` so
 * Paystack auto-splits the payment at settlement — the provider gets
 * (100 - platformFeePercent)% and the platform keeps the rest. For slot
 * purchases / recommendation fees, omit subaccountCode — 100% goes to the
 * platform's main account.
 * https://paystack.com/docs/api/transaction/#initialize
 */
async function initializeTransaction({ email, amountNaira, reference, callbackUrl, subaccountCode, metadata }) {
  const payload = {
    email,
    amount: Math.round(amountNaira * 100), // Paystack expects kobo
    reference,
    callback_url: callbackUrl,
    metadata,
  };
  if (subaccountCode) {
    payload.subaccount = subaccountCode;
    payload.bearer_type = "account"; // the subaccount (provider) bears Paystack's own transaction charge
  }
  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Could not start payment.");
  return data.data; // { authorization_url, access_code, reference }
}

/**
 * Confirms a transaction's real status directly from Paystack — always do
 * this server-side rather than trusting the frontend redirect alone.
 * https://paystack.com/docs/api/transaction/#verify
 */
async function verifyTransaction(reference) {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Could not verify transaction.");
  return data.data; // { status: 'success' | ..., amount, reference, metadata, ... }
}

/**
 * Verifies the `x-paystack-signature` header on incoming webhooks — the
 * signature is an HMAC SHA512 of the RAW request body using your secret
 * key. Requires the raw body bytes (see server.js webhook route wiring).
 * https://paystack.com/docs/payments/webhooks/#verify-event-origin
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(rawBody)
    .digest("hex");
  return hash === signatureHeader;
}

module.exports = {
  listBanks,
  resolveAccountNumber,
  createSubaccount,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
};
