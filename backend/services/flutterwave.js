const BASE_URL = "https://api.flutterwave.com/v3";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * List of banks for the dropdown when a provider adds their payout account.
 * https://developer.flutterwave.com/reference/endpoints/banks
 */
async function listBanks() {
  const res = await fetch(`${BASE_URL}/banks/NG`, { headers: authHeaders() });
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Could not fetch bank list.");
  return data.data; // [{ id, code, name }]
}

/**
 * Confirms an account number/name before saving it.
 * https://developer.flutterwave.com/reference/endpoints/resolve-account-number
 */
async function resolveAccountNumber(accountNumber, bankCode) {
  const res = await fetch(`${BASE_URL}/accounts/resolve`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Could not verify account number.");
  return data.data; // { account_number, account_name }
}

/**
 * Creates a Flutterwave Subaccount so future transactions can auto-split
 * between the provider and the platform.
 * https://developer.flutterwave.com/reference/endpoints/subaccounts
 */
async function createSubaccount({ businessName, bankCode, accountNumber, platformFeePercent, email }) {
  const res = await fetch(`${BASE_URL}/subaccounts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      account_bank: bankCode,
      account_number: accountNumber,
      business_name: businessName,
      business_email: email,
      // Flutterwave's split_value on the subaccount is what THEY (the
      // provider) receive per transaction by default; we instead set the
      // split explicitly per-transaction below so the platform fee is
      // always applied consistently regardless of subaccount defaults.
      split_value: (100 - platformFeePercent) / 100,
    }),
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Could not create payout account.");
  return data.data; // { id, subaccount_id, ... }
}

/**
 * Starts a payment. For booking payments, pass `subaccountId` so
 * Flutterwave auto-splits at settlement.
 * https://developer.flutterwave.com/reference/endpoints/standard
 */
async function initializeTransaction({ email, name, amountNaira, reference, redirectUrl, subaccountId, meta }) {
  const payload = {
    tx_ref: reference,
    amount: amountNaira,
    currency: "NGN",
    redirect_url: redirectUrl,
    customer: { email, name },
    meta,
  };
  if (subaccountId) {
    payload.subaccounts = [{ id: subaccountId }];
  }
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Could not start payment.");
  return data.data; // { link } — the hosted checkout URL
}

/**
 * Confirms a transaction's real status directly from Flutterwave.
 * https://developer.flutterwave.com/reference/endpoints/transactions
 */
async function verifyTransaction(transactionId) {
  const res = await fetch(`${BASE_URL}/transactions/${transactionId}/verify`, { headers: authHeaders() });
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.message || "Could not verify transaction.");
  return data.data; // { status: 'successful' | ..., amount, tx_ref, meta, ... }
}

/**
 * Flutterwave webhooks send back the "verif-hash" header, which must match
 * the secret hash YOU set in the Flutterwave dashboard (FLW_WEBHOOK_HASH) —
 * unlike Paystack, this isn't a signature of the body, it's a shared secret
 * you configure yourself.
 * https://developer.flutterwave.com/docs/integration-guides/webhooks
 */
function verifyWebhookSignature(signatureHeader) {
  return !!process.env.FLW_WEBHOOK_HASH && signatureHeader === process.env.FLW_WEBHOOK_HASH;
}

module.exports = {
  listBanks,
  resolveAccountNumber,
  createSubaccount,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
};
