const crypto = require("crypto");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Booking = require("../models/Booking");
const VerificationRequest = require("../models/VerificationRequest");
const RecommendationRequest = require("../models/RecommendationRequest");
const { matchProviders } = require("./recommendationController");
const { PLATFORM_FEE_PERCENT, CALLBACK_BASE_URL, isLive } = require("../config/paymentConfig");
const paystack = require("../services/paystack");
const flutterwave = require("../services/flutterwave");
const { notify } = require("../utils/notify");

// ---------- helpers ----------

function generateReference(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

// Rejects objects/arrays so { bookingId: { $ne: null } } can't reach a query.
const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

const GATEWAYS = ["paystack", "flutterwave"];

const FIXED_AMOUNT_ENV = {
  provider_slot: "PROVIDER_SLOT_FEE_NGN",
  recommendation_fee: "RECOMMENDATION_FEE_NGN",
  verification_badge: "VERIFICATION_BADGE_FEE_NGN",
};

function fixedAmount(purpose) {
  const n = Number(process.env[FIXED_AMOUNT_ENV[purpose]]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- payment success handling ----------

/**
 * Runs whatever should happen when a payment is confirmed successful.
 * Called from the simulate path AND from settlePayment (webhooks + verify),
 * so side effects are identical either way.
 */
async function applyPaymentSuccess(payment) {
  // Atomic claim: only one caller can flip a payment to success
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "success" } },
    { status: "success" },
    { new: true }
  );
  if (!claimed) return; // already processed by someone else
  payment = claimed;

  try {
    switch (payment.purpose) {
      case "provider_slot": {
        await User.findByIdAndUpdate(payment.user, { slotPaid: true });
        await notify({
          userId: payment.user,
          type: "payment",
          title: "Slot payment received",
          message: "Your provider slot payment was received. An admin will review your application shortly.",
          link: "/provider/settings",
        });
        break;
      }
      case "recommendation_fee": {
        const requestId = payment.meta?.recommendationRequestId;
        if (requestId) {
          const request = await RecommendationRequest.findById(requestId);
          if (request && request.status === "pending_payment") {
            request.payment = payment._id;
            await matchProviders(request); // sets matchedProviders + status: "matched"
          }
        }
        await notify({
          userId: payment.user,
          type: "payment",
          title: "You've been matched!",
          message: requestId
            ? "Payment received — check your recommendation for matched providers."
            : "Payment received — you'll be matched with a recommended provider shortly.",
          link: requestId ? `/dashboard/recommendations/${requestId}` : "/dashboard",
        });
        break;
      }
      case "booking_payment": {
        if (payment.booking) {
          const booking = await Booking.findOneAndUpdate(
            { _id: payment.booking, paymentStatus: "unpaid" }, // only the first payment wins
            { paymentStatus: "paid", payment: payment._id },
            { new: true }
          ).populate("service", "title");
          if (!booking) {
            // Booking was already paid by another payment: flag for a manual refund
            await Payment.updateOne({ _id: payment._id }, { "meta.duplicate": true });
            console.error(
              `[payments] DUPLICATE payment ${payment.reference}: booking already paid, needs refund`
            );
            break;
          }
          await notify({
            userId: booking.provider,
            type: "payment",
            title: "Payment received",
            message: `Payment for "${booking.service?.title || "a booking"}" has been received.`,
            link: "/provider/bookings",
          });
        }
        break;
      }
      case "verification_badge": {
        const req = await VerificationRequest.findOneAndUpdate(
          { provider: payment.user, status: "awaiting_payment" },
          { badgeFeePaid: true, status: "approved", payment: payment._id },
          { new: true }
        );
        if (req) {
          await User.findByIdAndUpdate(payment.user, { isVerifiedBadge: true, verifiedBadgeAt: new Date() });
          await notify({
            userId: payment.user,
            type: "verification",
            title: "You're now a Verified Provider!",
            message: "Your Verified badge is live on your profile and services.",
            link: "/provider/settings",
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Release the claim so a webhook retry or the next verify call can try again
    await Payment.updateOne({ _id: payment._id }, { status: "pending" });
    throw err;
  }
}

/**
 * Asks the gateway whether this payment really succeeded, for the right
 * amount and currency. Returns { ok: true } or { ok: false, reason, final }.
 * final=true means it can never become valid (e.g. underpaid).
 */
async function confirmWithGateway(payment) {
  if (payment.provider === "paystack") {
    const tx = await paystack.verifyTransaction(payment.reference);
    if (tx.status !== "success") return { ok: false, reason: `gateway status: ${tx.status}`, final: false };
    if (tx.currency && tx.currency !== "NGN") return { ok: false, reason: "wrong currency", final: true };
    const expectedKobo = Math.round(payment.amount * 100);
    if (tx.amount < expectedKobo) {
      return { ok: false, reason: `underpaid: got ${tx.amount} kobo, expected ${expectedKobo}`, final: true };
    }
    return { ok: true };
  }

  if (payment.provider === "flutterwave") {
    const tx = await flutterwave.verifyByReference(payment.reference);
    if (tx.status !== "successful") return { ok: false, reason: `gateway status: ${tx.status}`, final: false };
    if (tx.currency && tx.currency !== "NGN") return { ok: false, reason: "wrong currency", final: true };
    if (Math.round(Number(tx.amount) * 100) < Math.round(payment.amount * 100)) {
      return { ok: false, reason: `underpaid: got ${tx.amount}, expected ${payment.amount}`, final: true };
    }
    return { ok: true };
  }

  return { ok: false, reason: "unknown gateway", final: false };
}

/** Shared by both webhooks and the verify endpoint. */
async function settlePayment(payment) {
  if (payment.purpose === "withdrawal") return { ok: false, reason: "not a gateway payment", final: false };
  if (payment.status === "success") return { ok: true };

  const result = await confirmWithGateway(payment);
  if (result.ok) {
    await applyPaymentSuccess(payment);
    return { ok: true };
  }
  if (result.final) {
    console.error(`[payments] ${payment.reference} rejected: ${result.reason}`);
    await Payment.updateOne(
      { _id: payment._id, status: "pending" },
      { status: "failed", "meta.verifyFailure": result.reason }
    );
  }
  return result;
}

// ---------- checkout ----------

// POST /api/payments/initialize  (any authenticated user)
// body: { purpose, gateway: "paystack"|"flutterwave", bookingId?, recommendationRequestId? }
async function initializePayment(req, res) {
  try {
    const { purpose, gateway, bookingId, recommendationRequestId } = req.body || {};
    const validPurposes = ["provider_slot", "recommendation_fee", "booking_payment", "verification_badge"];
    if (typeof purpose !== "string" || !validPurposes.includes(purpose)) {
      return res.status(400).json({ message: `purpose must be one of: ${validPurposes.join(", ")}` });
    }
    if (typeof gateway !== "string" || !GATEWAYS.includes(gateway)) {
      return res.status(400).json({ message: "gateway must be paystack or flutterwave." });
    }

    let amount;
    let booking = null;
    let subaccountCode = null; // only set for booking_payment, so the split happens automatically
    let recommendationRequest = null;

    if (purpose === "provider_slot" && req.user.slotPaid) {
      return res.status(400).json({ message: "Your provider slot is already paid for." });
    }

    if (purpose === "verification_badge") {
      const pending = await VerificationRequest.findOne({ provider: req.user._id, status: "awaiting_payment" });
      if (!pending) {
        return res.status(400).json({ message: "You don't have a verification request awaiting payment." });
      }
    }

    if (purpose === "recommendation_fee") {
      if (!isId(recommendationRequestId)) {
        return res.status(400).json({ message: "A valid recommendationRequestId is required for recommendation_fee." });
      }
      recommendationRequest = await RecommendationRequest.findById(recommendationRequestId);
      if (!recommendationRequest) return res.status(404).json({ message: "Recommendation request not found." });
      if (String(recommendationRequest.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "This isn't your request." });
      }
      if (recommendationRequest.status !== "pending_payment") {
        return res.status(400).json({ message: "This request has already been paid for." });
      }
    }

    if (purpose === "booking_payment") {
      if (!isId(bookingId)) return res.status(400).json({ message: "A valid bookingId is required for booking_payment." });
      booking = await Booking.findById(bookingId).populate("provider");
      if (!booking) return res.status(404).json({ message: "Booking not found." });
      if (String(booking.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "This isn't your booking." });
      }
      if (booking.paymentStatus === "paid") {
        return res.status(400).json({ message: "This booking has already been paid for." });
      }
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "This booking was cancelled." });
      }
      if (booking.isTrialBooking || !(booking.price > 0)) {
        return res.status(400).json({ message: "No payment is required for this booking." });
      }
      amount = booking.price;
      const providerDoc = booking.provider;
      subaccountCode = gateway === "paystack" ? providerDoc.paystackSubaccountCode : providerDoc.flutterwaveSubaccountId;
      if (isLive() && !subaccountCode) {
        return res.status(400).json({
          message: "This provider hasn't set up a payout account yet, so they can't receive payments right now.",
        });
      }
    } else {
      amount = fixedAmount(purpose);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      console.error(`[payments] amount not configured or invalid for purpose "${purpose}"`);
      return res.status(500).json({ message: "Payment amount is not configured for this purpose." });
    }

    const reference = generateReference(purpose);
    const payment = await Payment.create({
      user: req.user._id,
      booking: booking ? booking._id : undefined,
      purpose,
      provider: gateway,
      amount,
      status: "pending",
      reference,
      meta: {
        platformFeePercent: purpose === "booking_payment" ? PLATFORM_FEE_PERCENT : 0,
        // true = the gateway splits the money straight to the provider's bank,
        // so it must NOT also be withdrawable through manual withdrawals.
        autoSplit: purpose === "booking_payment" && isLive() && !!subaccountCode,
        recommendationRequestId: recommendationRequest ? String(recommendationRequest._id) : undefined,
      },
    });

    // --- SIMULATE MODE: no real gateway involved, resolve immediately ---
    if (!isLive()) {
      await applyPaymentSuccess(payment);
      return res.json({
        message: "Payment simulated successfully (PAYMENTS_MODE=simulate).",
        simulated: true,
        payment: await Payment.findById(payment._id),
      });
    }

    // --- LIVE MODE: real Paystack/Flutterwave call ---
    const callbackUrl = `${CALLBACK_BASE_URL}/payments/callback?reference=${reference}`;
    try {
      if (gateway === "paystack") {
        const tx = await paystack.initializeTransaction({
          email: req.user.email,
          amountNaira: amount,
          reference,
          callbackUrl,
          subaccountCode: subaccountCode || undefined,
          metadata: { purpose, userId: String(req.user._id) },
        });
        return res.json({ message: "Payment initialized.", checkoutUrl: tx.authorization_url, reference, payment });
      }
      const tx = await flutterwave.initializeTransaction({
        email: req.user.email,
        name: req.user.name,
        amountNaira: amount,
        reference,
        redirectUrl: callbackUrl,
        subaccountId: subaccountCode || undefined,
        meta: { purpose, userId: String(req.user._id) },
      });
      return res.json({ message: "Payment initialized.", checkoutUrl: tx.link, reference, payment });
    } catch (gatewayErr) {
      console.error("[payments] gateway initialize failed:", gatewayErr);
      await Payment.updateOne({ _id: payment._id, status: "pending" }, { status: "failed", "meta.initFailure": true });
      return res.status(502).json({ message: "Could not start payment with the payment provider. Please try again." });
    }
  } catch (err) {
    console.error("[payments] initializePayment error:", err);
    return res.status(500).json({ message: "Could not start payment." });
  }
}

// GET /api/payments/verify/:reference  (frontend callback page polls this)
async function verifyPayment(req, res) {
  try {
    const reference = req.params.reference;
    if (typeof reference !== "string" || reference.length > 200) {
      return res.status(400).json({ message: "Invalid reference." });
    }
    const payment = await Payment.findOne({ reference });
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (String(payment.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your payment." });
    }

    if (payment.status === "success" || !isLive()) {
      return res.json({ payment });
    }

    // Double-check with the real gateway rather than trusting the redirect alone
    const result = await settlePayment(payment);
    const refreshed = await Payment.findById(payment._id);
    if (!result.ok && result.final) {
      return res.status(400).json({ message: "Payment could not be verified.", payment: refreshed });
    }
    return res.json({ payment: refreshed });
  } catch (err) {
    console.error("[payments] verifyPayment error:", err);
    return res.status(500).json({ message: "Could not verify payment." });
  }
}

// ---------- webhooks ----------
// Webhooks are only a trigger: settlePayment re-verifies with the gateway API
// and checks amount + currency, so a forged or replayed payload can't mark
// anything as paid.

// POST /api/payments/webhook/paystack
async function paystackWebhook(req, res) {
  try {
    const signature = req.headers["x-paystack-signature"];
    if (!paystack.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ message: "Invalid signature." });
    }
    const event = req.body;
    if (event?.event === "charge.success" && typeof event.data?.reference === "string") {
      const payment = await Payment.findOne({ reference: event.data.reference });
      if (payment) await settlePayment(payment);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("[payments] paystackWebhook error:", err);
    return res.sendStatus(500); // gateway will retry
  }
}

// POST /api/payments/webhook/flutterwave
async function flutterwaveWebhook(req, res) {
  try {
    const signature = req.headers["verif-hash"];
    if (!flutterwave.verifyWebhookSignature(signature)) {
      return res.status(401).json({ message: "Invalid signature." });
    }
    const event = req.body;
    if (event?.status === "successful" || event?.data?.status === "successful") {
      const reference = event.txRef || event.data?.tx_ref;
      if (typeof reference === "string") {
        const payment = await Payment.findOne({ reference });
        if (payment) await settlePayment(payment);
      }
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("[payments] flutterwaveWebhook error:", err);
    return res.sendStatus(500); // gateway will retry
  }
}

// ---------- provider payout account onboarding ----------

// GET /api/payments/banks?gateway=paystack|flutterwave
async function getBanks(req, res) {
  try {
    const gateway = req.query.gateway === "flutterwave" ? flutterwave : paystack;
    const banks = await gateway.listBanks();
    return res.json({ banks });
  } catch (err) {
    console.error("[payments] getBanks error:", err);
    return res.status(500).json({ message: "Could not fetch bank list." });
  }
}

// POST /api/payments/payout-account  (provider)
// body: { gateway, bankCode, bankName, accountNumber, password }
async function addPayoutAccount(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers need a payout account." });
    }
    const { gateway, bankCode, bankName, accountNumber, password } = req.body || {};
    if (
      typeof gateway !== "string" || !GATEWAYS.includes(gateway) ||
      typeof bankCode !== "string" || !bankCode.trim() ||
      typeof accountNumber !== "string"
    ) {
      return res.status(400).json({ message: "gateway, bankCode and accountNumber are required." });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ message: "Account number must be 10 digits." });
    }
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Enter your password to change payout details." });
    }

    // Re-check the password so a hijacked session can't redirect payouts
    const fresh = await User.findById(req.user._id).select("+password");
    if (!fresh || !(await fresh.comparePassword(password))) {
      return res.status(403).json({ message: "Incorrect password." });
    }

    const safeBankName = typeof bankName === "string" ? bankName.slice(0, 100) : "";

    let accountName = req.user.name; // fallback in simulate mode
    let subaccountValue = "simulated-subaccount"; // placeholder in simulate mode

    if (isLive()) {
      const svc = gateway === "paystack" ? paystack : flutterwave;
      const resolved = await svc.resolveAccountNumber(accountNumber, bankCode);
      accountName = resolved.account_name;
      const sub = await svc.createSubaccount({
        businessName: req.user.name,
        bankCode,
        accountNumber,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        email: req.user.email,
      });
      // Flutterwave: the "RS_..." subaccount_id, not the numeric id
      subaccountValue = gateway === "paystack" ? sub.subaccount_code : sub.subaccount_id;
    }

    const subaccountField = gateway === "paystack" ? "paystackSubaccountCode" : "flutterwaveSubaccountId";

    req.user.bankAccount = { bankCode, bankName: safeBankName, accountNumber, accountName };
    req.user[subaccountField] = String(subaccountValue);
    await req.user.save();

    await notify({
      userId: req.user._id,
      type: "payment",
      title: "Payout account updated",
      message: "Your payout bank account was changed. If this wasn't you, contact support immediately.",
      link: "/provider/settings",
    });

    return res.json({ message: "Payout account added.", user: req.user.toSafeJSON() });
  } catch (err) {
    console.error("[payments] addPayoutAccount error:", err);
    return res.status(500).json({ message: "Could not add payout account. Check the account details and try again." });
  }
}

// ---------- earnings ----------

// Loads a provider's successful booking payments with fee/net computed.
// Queries by the provider's own bookings (not every payment in the system)
// and uses the fee percent stored on each payment, so changing
// PLATFORM_FEE_PERCENT later doesn't rewrite history.
async function loadProviderTransactions(providerId) {
  const bookingIds = await Booking.find({ provider: providerId }).distinct("_id");
  const payments = await Payment.find({
    purpose: "booking_payment",
    status: "success",
    "meta.duplicate": { $ne: true },
    booking: { $in: bookingIds },
  })
    .populate({
      path: "booking",
      populate: [
        { path: "service", select: "title" },
        { path: "customer", select: "name" },
      ],
    })
    .sort({ createdAt: -1 });

  const transactions = payments
    .filter((p) => p.booking)
    .map((p) => {
      const pct = p.meta?.platformFeePercent ?? PLATFORM_FEE_PERCENT;
      const fee = Math.round((p.amount * pct) / 100);
      return {
        id: p._id,
        date: p.createdAt,
        customer: p.booking.customer?.name || "Customer",
        service: p.booking.service?.title || "Service",
        amount: p.amount,
        fee,
        net: p.amount - fee,
        autoSplit: !!p.meta?.autoSplit, // already paid to the provider's bank by the gateway
        status: "completed",
      };
    });

  return {
    transactions,
    totalEarnings: transactions.reduce((sum, t) => sum + t.net, 0),
    totalFees: transactions.reduce((sum, t) => sum + t.fee, 0),
  };
}

// GET /api/payments/earnings  (provider)
async function getMyEarnings(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers have earnings." });
    }

    const { transactions, totalEarnings, totalFees } = await loadProviderTransactions(req.user._id);

    const byMonth = {};
    for (const t of transactions) {
      const key = new Date(t.date).toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!byMonth[key]) byMonth[key] = { month: key, earnings: 0, jobs: 0 };
      byMonth[key].earnings += t.net;
      byMonth[key].jobs += 1;
    }

    return res.json({
      transactions,
      totalEarnings,
      totalFees,
      monthlyOverview: Object.values(byMonth).slice(0, 6),
    });
  } catch (err) {
    console.error("[payments] getMyEarnings error:", err);
    return res.status(500).json({ message: "Could not fetch earnings." });
  }
}

// ---------- manual withdrawal requests ----------
// Fallback for money that has to be moved manually (e.g. a booking paid before
// the provider added a payout account, or an automatic split that failed).
// Auto-split payments are excluded: the gateway already paid those out.
// Reviewed and settled by an admin outside the gateway, never auto-processed.

// POST /api/payments/withdrawals  (provider)
async function requestWithdrawal(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers can request a withdrawal." });
    }
    const amount = Math.round(Number(req.body?.amount) * 100) / 100;
    const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 500) : "";
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "A valid amount is required." });
    }
    if (!req.user.bankAccount?.accountNumber) {
      return res.status(400).json({ message: "Add a payout bank account before requesting a withdrawal." });
    }

    // Only manually-held earnings, minus what's already requested or paid out
    const { transactions } = await loadProviderTransactions(req.user._id);
    const manualEarnings = transactions.filter((t) => !t.autoSplit).reduce((s, t) => s + t.net, 0);
    const [committed] = await Payment.aggregate([
      { $match: { user: req.user._id, purpose: "withdrawal", status: { $in: ["pending", "success"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const available = manualEarnings - (committed?.total || 0);
    if (amount > available) {
      return res.status(400).json({
        message: `You can request at most ₦${Math.max(available, 0).toLocaleString()} right now.`,
      });
    }

    const withdrawal = await Payment.create({
      user: req.user._id,
      purpose: "withdrawal",
      provider: "bank_transfer",
      amount,
      status: "pending",
      reference: generateReference("withdrawal"),
      meta: { note, bankAccount: req.user.bankAccount },
    });

    return res.status(201).json({ message: "Withdrawal request submitted for review.", withdrawal });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "You already have a pending withdrawal request." });
    }
    console.error("[payments] requestWithdrawal error:", err);
    return res.status(500).json({ message: "Could not submit withdrawal request." });
  }
}

// GET /api/payments/withdrawals/mine  (provider)
async function getMyWithdrawals(req, res) {
  try {
    const withdrawals = await Payment.find({ user: req.user._id, purpose: "withdrawal" }).sort({ createdAt: -1 });
    return res.json({ withdrawals });
  } catch (err) {
    console.error("[payments] getMyWithdrawals error:", err);
    return res.status(500).json({ message: "Could not fetch your withdrawal requests." });
  }
}

// GET /api/payments/withdrawals  (admin) — optional ?status=
async function listWithdrawals(req, res) {
  try {
    const filter = { purpose: "withdrawal" };
    if (typeof req.query.status === "string") filter.status = req.query.status;
    const withdrawals = await Payment.find(filter).populate("user", "name email bankAccount").sort({ createdAt: -1 });
    return res.json({ withdrawals });
  } catch (err) {
    console.error("[payments] listWithdrawals error:", err);
    return res.status(500).json({ message: "Could not fetch withdrawal requests." });
  }
}

// PATCH /api/payments/withdrawals/:id/decide  (admin)  body: { decision: "paid"|"reject", reason? }
async function decideWithdrawal(req, res) {
  try {
    const { decision } = req.body || {};
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : "";
    if (!["paid", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'paid' or 'reject'." });
    }
    if (!isId(req.params.id)) {
      return res.status(400).json({ message: "Invalid withdrawal id." });
    }

    // Atomic: two admins clicking at once can't both resolve the same request
    const withdrawal = await Payment.findOneAndUpdate(
      { _id: req.params.id, purpose: "withdrawal", status: "pending" },
      {
        status: decision === "paid" ? "success" : "failed",
        "meta.adminReason": reason,
        "meta.decidedBy": String(req.user._id),
        "meta.decidedAt": new Date(),
      },
      { new: true }
    );
    if (!withdrawal) {
      const exists = await Payment.exists({ _id: req.params.id, purpose: "withdrawal" });
      return exists
        ? res.status(400).json({ message: "This request has already been resolved." })
        : res.status(404).json({ message: "Withdrawal request not found." });
    }

    await notify({
      userId: withdrawal.user,
      type: "payment",
      title: decision === "paid" ? "Withdrawal sent" : "Withdrawal request declined",
      message:
        decision === "paid"
          ? `₦${withdrawal.amount.toLocaleString()} has been sent to your bank account.`
          : reason || "Your withdrawal request wasn't approved.",
      link: "/provider/earnings",
    });

    return res.json({ message: `Withdrawal marked ${withdrawal.status}.`, withdrawal });
  } catch (err) {
    console.error("[payments] decideWithdrawal error:", err);
    return res.status(500).json({ message: "Could not process withdrawal decision." });
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  flutterwaveWebhook,
  getBanks,
  addPayoutAccount,
  getMyEarnings,
  requestWithdrawal,
  getMyWithdrawals,
  listWithdrawals,
  decideWithdrawal,
};