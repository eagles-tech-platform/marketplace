require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const paystack = require("../services/paystack");
const { decryptSecret } = require("../utils/subscriptionCrypto");
const { activateFromVerifiedPayment } = require("../controllers/subscriptionController");
const { notify } = require("../utils/notify");
const { isLive } = require("../config/paymentConfig");
const crypto = require("crypto");

const POLL_MS = Number(process.env.SUBSCRIPTION_WORKER_POLL_MS || 60000);
const LOCK_MS = 5 * 60 * 1000;
const MAX_RETRIES = 4;
const RETRY_DAYS = [1, 3, 5];
let stopping = false;

function makeReference() { return `subrenew_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`; }

async function scheduleFailure(subscription, payment, reason) {
  const attempts = Number(subscription.retryCount || 0) + 1;
  await Payment.updateOne({ _id: payment._id, status: "pending" }, { status: "failed", "meta.failure": String(reason || "charge_failed").slice(0, 180) });
  subscription.retryCount = attempts;
  subscription.billingLockUntil = null;
  subscription.lastFailureCode = String(reason || "charge_failed").slice(0, 180);
  if (attempts >= MAX_RETRIES) {
    subscription.status = "expired";
    subscription.autoRenew = false;
    subscription.nextRetryAt = null;
    await notify({ userId: subscription.user, type: "payment", title: "Subscription renewal failed", message: "We could not renew your subscription after several attempts. Your membership has expired. Choose a plan and subscribe again to restore access.", link: "/dashboard/settings" });
  } else {
    subscription.status = "past_due";
    subscription.graceUntil = subscription.graceUntil || new Date(Date.now() + 7 * 86400000);
    subscription.nextRetryAt = new Date(Date.now() + RETRY_DAYS[Math.min(attempts - 1, RETRY_DAYS.length - 1)] * 86400000);
    await notify({ userId: subscription.user, type: "payment", title: "Subscription payment unsuccessful", message: `Your renewal could not be processed. We will retry automatically. Please ensure your payment method has sufficient funds.`, link: "/dashboard/settings" });
  }
  await subscription.save();
}

async function reconcilePending(subscription) {
  const pending = await Payment.findOne({ user: subscription.user, purpose: "subscription_renewal", status: "pending", "meta.subscriptionId": String(subscription._id) }).sort({ createdAt: -1 });
  if (!pending) return false;
  if (Date.now() - pending.createdAt.getTime() < 2 * 60 * 1000) return true;
  try {
    const verified = await paystack.verifyTransaction(pending.reference);
    if (verified.status === "success") {
      await activateFromVerifiedPayment(pending, verified, "paystack");
      return true;
    }
    if (["failed", "abandoned", "reversed", "not_found"].includes(verified.status)) {
      await scheduleFailure(subscription, pending, verified.status);
      return true;
    }
    // A pending/unknown response is not permission to charge again.
    subscription.status = "past_due";
    subscription.billingLockUntil = null;
    subscription.nextRetryAt = new Date(Date.now() + 30 * 60 * 1000);
    await subscription.save();
    return true;
  } catch (err) {
    console.error("[subscription-worker] pending reconciliation failed:", err.message);
    subscription.status = "past_due";
    subscription.billingLockUntil = null;
    subscription.nextRetryAt = new Date(Date.now() + 60 * 60 * 1000);
    await subscription.save();
    return true;
  }
}

async function processOne() {
  const now = new Date();
  const sub = await Subscription.findOneAndUpdate({
    gateway: "paystack",
    status: { $in: ["active", "past_due"] },
    autoRenew: true,
    "paymentMethod.reusable": true,
    $or: [
      { nextPaymentDate: { $lte: now }, status: "active" },
      { nextRetryAt: { $lte: now }, status: "past_due" },
    ],
    $and: [{ $or: [{ billingLockUntil: null }, { billingLockUntil: { $exists: false } }, { billingLockUntil: { $lte: now } }] }],
  }, { $set: { billingLockUntil: new Date(Date.now() + LOCK_MS) } }, { new: true }).select("+paymentMethod.authorizationCiphertext +paymentMethod.authorizationIv +paymentMethod.authorizationTag");
  if (!sub) return false;

  if (await reconcilePending(sub)) return true;
  let authorizationCode;
  try {
    authorizationCode = decryptSecret(sub.paymentMethod);
  } catch (err) {
    sub.status = "past_due";
    sub.autoRenew = false;
    sub.billingLockUntil = null;
    sub.lastFailureCode = "payment_authorization_unavailable";
    await sub.save();
    await notify({ userId: sub.user, type: "payment", title: "Payment method needs updating", message: "We could not access your saved recurring payment authorization. Please subscribe again with a valid payment method.", link: "/dashboard/settings" });
    return true;
  }
  const payment = await Payment.create({ user: sub.user, purpose: "subscription_renewal", provider: "paystack", amount: sub.amount, currency: sub.currency, status: "pending", reference: makeReference(), meta: { subscriptionId: String(sub._id), interval: sub.interval, retryAttempt: sub.retryCount + 1 } });
  try {
    const result = await paystack.chargeAuthorization({ authorizationCode, email: sub.gatewayEmail, amountKobo: Math.round(sub.amount * 100), currency: sub.currency, reference: payment.reference, metadata: { purpose: "subscription_renewal", subscriptionId: String(sub._id), paymentId: String(payment._id) } });
    const chargeStatus = result.status;
    if (chargeStatus === "success") {
      const verified = await paystack.verifyTransaction(payment.reference);
      await activateFromVerifiedPayment(payment, verified, "paystack");
    } else if (["failed", "abandoned", "reversed"].includes(chargeStatus)) {
      await scheduleFailure(sub, payment, result.gateway_response || chargeStatus);
    } else {
      // Pending/OTP/challenge outcomes are reconciled later; never issue a second debit while unresolved.
      sub.status = "past_due";
      sub.billingLockUntil = null;
      sub.nextRetryAt = new Date(Date.now() + 30 * 60 * 1000);
      await sub.save();
    }
  } catch (err) {
    console.error("[subscription-worker] charge outcome uncertain:", err.message);
    // Treat timeouts as uncertain, not failed: the gateway may have accepted the charge.
    sub.status = "past_due";
    sub.billingLockUntil = null;
    sub.nextRetryAt = new Date(Date.now() + 30 * 60 * 1000);
    sub.lastFailureCode = "charge_outcome_uncertain";
    await sub.save();
  }
  return true;
}

async function sendRenewalReminders() {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 86400000);
  const due = await Subscription.find({ gateway: "paystack", status: "active", autoRenew: true, nextPaymentDate: { $gt: now, $lte: inThreeDays }, $or: [{ lastRenewalReminderAt: null }, { lastRenewalReminderAt: { $exists: false } }, { lastRenewalReminderAt: { $lt: new Date(now.getTime() - 20 * 86400000) } }] }).limit(100);
  for (const sub of due) {
    const claimed = await Subscription.updateOne({ _id: sub._id, lastRenewalReminderAt: sub.lastRenewalReminderAt || null }, { $set: { lastRenewalReminderAt: now } });
    if (claimed.modifiedCount) await notify({ userId: sub.user, type: "payment", title: "Upcoming subscription renewal", message: `Your ${sub.interval} Marketplace membership is scheduled to renew on ${sub.nextPaymentDate.toLocaleDateString()}. You can manage automatic renewal in your account settings.`, link: "/dashboard/settings" });
  }
}

async function expireNonRenewingSubscriptions() {
  const now = new Date();
  const result = await Subscription.updateMany(
    { status: "non_renewing", currentPeriodEnd: { $lte: now } },
    { $set: { status: "expired", autoRenew: false, nextRetryAt: null } }
  );
  if (result.modifiedCount) console.log(`[subscription-worker] expired ${result.modifiedCount} non-renewing subscription(s)`);
}

async function run() {
  if (!isLive()) throw new Error("Subscription worker refuses to run unless PAYMENTS_MODE=live.");
  await connectDB();
  console.log("[subscription-worker] started");
  while (!stopping) {
    try {
      await expireNonRenewingSubscriptions();
      await sendRenewalReminders();
      const didWork = await processOne();
      if (!didWork) await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    } catch (err) {
      console.error("[subscription-worker] loop error:", err.message);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
  await mongoose.disconnect();
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
run().catch((err) => { console.error("[subscription-worker] fatal:", err); process.exit(1); });
