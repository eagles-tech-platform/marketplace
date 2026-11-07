const crypto = require("crypto");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const { claimNextSlot, getStatus: getFoundingStatus } = require("../models/FoundingMemberCounter");
const { currencyForState } = require("../utils/currency");
const { isLive } = require("../config/paymentConfig");
const { notify } = require("../utils/notify");
const { encryptSecret } = require("../utils/subscriptionCrypto");
const paystack = require("../services/paystack");
const flutterwave = require("../services/flutterwave");

const DEFAULT_PLANS = [
  { name: "Basic", tier: "basic", role: "both", priceNgnMonthly: 1500, priceNgnQuarterly: 4500, priceNgnYearly: 15000, priceUsdMonthly: 3, priceUsdQuarterly: 9, priceUsdYearly: 30, features: ["List up to 5 active services", "Standard placement in search results", "Email support"] },
  { name: "Pro", tier: "pro", role: "both", priceNgnMonthly: 4000, priceNgnQuarterly: 12000, priceNgnYearly: 40000, priceUsdMonthly: 8, priceUsdQuarterly: 24, priceUsdYearly: 80, features: ["Unlimited active services", "Priority placement in search & recommendations", "Verified badge fee discount", "Priority support"] },
];

const INTERVALS = {
  monthly: { months: 1, flutterwave: "monthly" },
  quarterly: { months: 3, flutterwave: "quarterly" },
  annual: { months: 12, flutterwave: "yearly" },
};
const RETRY_DELAYS_DAYS = [1, 3, 5];

async function ensurePlansExist() {
  if (await SubscriptionPlan.countDocuments() === 0) await SubscriptionPlan.insertMany(DEFAULT_PLANS);
  // Backfill quarterly amounts for older plan documents without changing existing prices.
  const plans = await SubscriptionPlan.find({ $or: [{ priceNgnQuarterly: { $exists: false } }, { priceUsdQuarterly: { $exists: false } }] });
  for (const plan of plans) {
    plan.priceNgnQuarterly ??= plan.priceNgnMonthly * 3;
    plan.priceUsdQuarterly ??= plan.priceUsdMonthly * 3;
    await plan.save();
  }
}

function addMonthsClamped(from, months) {
  const date = new Date(from);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function priceFor(plan, currency, interval) {
  const suffix = currency === "NGN" ? "Ngn" : "Usd";
  const period = interval === "annual" ? "Yearly" : interval === "quarterly" ? "Quarterly" : "Monthly";
  const value = Number(plan[`price${suffix}${period}`]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function planCacheKey(currency, interval) { return `${currency}_${interval}`; }

async function getFlutterwavePlan(plan, currency, interval, amount) {
  const key = planCacheKey(currency, interval);
  const cached = plan.gatewayPlans?.get?.(key) || plan.gatewayPlans?.[key];
  if (cached?.id && cached.amount === amount) return cached;
  const created = await flutterwave.createPaymentPlan({
    name: `Marketplace ${plan.name} ${interval}`.slice(0, 80),
    amount,
    currency,
    interval: INTERVALS[interval].flutterwave,
  });
  plan.gatewayPlans.set(key, { id: String(created.id), amount, currency, interval, createdAt: new Date() });
  await plan.save();
  return { id: String(created.id), amount, currency, interval };
}


async function getBillingCapabilities(req, res) {
  const paystackEnabled = isLive() && !!process.env.PAYSTACK_SECRET_KEY && !!process.env.SUBSCRIPTION_TOKEN_ENCRYPTION_KEY;
  const flutterwaveEnabled = isLive() && !!process.env.FLUTTERWAVE_SECRET_KEY;
  return res.json({
    recurringEnabled: paystackEnabled || flutterwaveEnabled,
    gateways: {
      paystack: { enabled: paystackEnabled, recurring: true, currencies: (process.env.PAYSTACK_RECURRING_CURRENCIES || "NGN").split(",").map((v) => v.trim()).filter(Boolean) },
      flutterwave: { enabled: flutterwaveEnabled, recurring: true },
    },
    intervals: ["monthly", "quarterly", "annual"],
    audiences: ["customer", "provider"],
    mode: isLive() ? "live" : "simulate",
  });
}

async function getPlans(req, res) {
  try {
    await ensurePlansExist();
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ priceNgnMonthly: 1 });
    const currency = currencyForState(req.query.state);
    return res.json({ currency, intervals: Object.keys(INTERVALS), plans: plans.map((p) => ({
      id: p._id, name: p.name, tier: p.tier, role: p.role, features: p.features,
      prices: {
        monthly: priceFor(p, currency, "monthly"),
        quarterly: priceFor(p, currency, "quarterly"),
        annual: priceFor(p, currency, "annual"),
      },
    })) });
  } catch (err) {
    console.error("[subscriptions] getPlans:", err.message);
    return res.status(500).json({ message: "Could not fetch plans." });
  }
}

async function getFoundingMemberStatus(req, res) {
  try { return res.json(await getFoundingStatus()); }
  catch (err) { return res.status(500).json({ message: "Could not fetch founding member status." }); }
}

async function getMySubscription(req, res) {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).populate("plan", "name tier features").sort({ createdAt: -1 });
    return res.json({ subscriptions, subscription: subscriptions.find((s) => s.audience === "customer") || subscriptions[0] || null });
  } catch (err) {
    console.error("[subscriptions] getMine:", err.message);
    return res.status(500).json({ message: "Could not fetch your subscriptions." });
  }
}

async function getMyHistory(req, res) {
  try {
    const subscriptionIds = await Subscription.find({ user: req.user._id }).distinct("_id");
    const payments = await Payment.find({ user: req.user._id, purpose: { $in: ["subscription_initial", "subscription_renewal"] }, "meta.subscriptionId": { $in: subscriptionIds } }).sort({ createdAt: -1 }).limit(100).select("amount currency provider status reference createdAt meta");
    return res.json({ payments });
  } catch (err) {
    console.error("[subscriptions] history:", err.message);
    return res.status(500).json({ message: "Could not fetch billing history." });
  }
}

async function enrollNewUser(user) {
  try {
    const claim = await claimNextSlot();
    if (claim) {
      const freeUntil = new Date(); freeUntil.setMonth(freeUntil.getMonth() + claim.freeMonths);
      await Subscription.updateOne({ user: user._id, audience: "customer" }, { $setOnInsert: { user: user._id, audience: "customer", status: "founding_free", isFoundingMember: true, foundingMemberNumber: claim.slotNumber, freeUntil, currency: currencyForState(user.state) } }, { upsert: true });
    } else {
      await Subscription.updateOne({ user: user._id, audience: "customer" }, { $setOnInsert: { user: user._id, audience: "customer", status: "none", currency: currencyForState(user.state) } }, { upsert: true });
    }
  } catch (err) { console.error("[subscriptions] enrollNewUser:", err.message); }
}

async function subscribe(req, res) {
  try {
    const { planId, interval, gateway, audience = "customer", consent } = req.body || {};
    if (!planId || !["monthly", "quarterly", "annual"].includes(interval) || !["paystack", "flutterwave"].includes(gateway) || !["customer", "provider"].includes(audience)) {
      return res.status(400).json({ message: "Provide planId, interval (monthly/quarterly/annual), gateway and audience (customer/provider)." });
    }
    if (consent !== true) return res.status(400).json({ message: "You must explicitly authorize recurring billing before continuing." });
    if (audience === "provider" && !req.user.canBeProvider) return res.status(403).json({ message: "Only provider-enabled accounts can buy provider membership." });
    if (audience === "customer" && !req.user.canBeCustomer) return res.status(403).json({ message: "This account cannot buy customer membership." });

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive || (plan.role !== "both" && plan.role !== audience)) return res.status(404).json({ message: "Plan is unavailable for this account type." });
    const currency = currencyForState(req.user.state);
    const amount = priceFor(plan, currency, interval);
    if (!amount) return res.status(400).json({ message: `This plan has no configured ${currency} ${interval} price.` });
    if (gateway === "paystack" && currency !== "NGN" && process.env.PAYSTACK_RECURRING_CURRENCIES?.split(",").map((v) => v.trim()).includes(currency) !== true) {
      return res.status(400).json({ message: "Paystack recurring billing is not enabled for this currency on this deployment. Choose Flutterwave or NGN." });
    }
    if (!isLive()) {
      return res.status(409).json({ message: "Recurring subscriptions are disabled in simulate mode. Use gateway test credentials and PAYMENTS_MODE=live in a staging environment." });
    }
    if (gateway === "paystack" && !process.env.SUBSCRIPTION_TOKEN_ENCRYPTION_KEY) return res.status(503).json({ message: "Paystack recurring billing is not configured. Contact support." });

    const existing = await Subscription.findOne({ user: req.user._id, audience });
    if (existing && ["pending", "active", "past_due", "non_renewing"].includes(existing.status)) {
      return res.status(409).json({ message: "You already have a subscription in progress for this account type.", subscription: existing });
    }
    if (gateway === "flutterwave") {
      const otherFlutterwaveMembership = await Subscription.findOne({ user: req.user._id, gateway: "flutterwave", status: { $in: ["pending", "active", "past_due", "non_renewing"] }, audience: { $ne: audience } });
      if (otherFlutterwaveMembership) return res.status(409).json({ message: "This account already has a Flutterwave recurring membership for the other account type. Use Paystack for the second membership or cancel the existing Flutterwave mandate first." });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { user: req.user._id, audience },
      { $set: { plan: plan._id, interval, currency, amount, gateway, status: "pending", autoRenew: true, cancelAtPeriodEnd: false, retryCount: 0, nextRetryAt: null, graceUntil: null, gatewayEmail: req.user.email, gatewayPlanId: null, gatewaySubscriptionId: null, lastFailureCode: null, metadata: { consentVersion: "recurring-v1", consentAt: new Date(), consentIp: req.ip, consentUserAgent: String(req.headers["user-agent"] || "").slice(0, 300) } } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const reference = `subinit_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const payment = await Payment.create({ user: req.user._id, purpose: "subscription_initial", provider: gateway, amount, currency, status: "pending", reference, meta: { subscriptionId: String(subscription._id), planId: String(plan._id), audience, interval } });
    const callbackUrl = `${(process.env.PAYMENT_CALLBACK_BASE_URL || process.env.CLIENT_URL || "").split(",")[0].replace(/\/+$/, "")}/subscription/callback`;

    try {
      let checkoutUrl;
      if (gateway === "paystack") {
        const tx = await paystack.initializeTransaction({ email: req.user.email, amountNaira: amount, reference, callbackUrl, metadata: { purpose: "subscription_initial", subscriptionId: String(subscription._id), userId: String(req.user._id), audience, interval } , currency });
        checkoutUrl = tx.authorization_url;
      } else {
        const gatewayPlan = await getFlutterwavePlan(plan, currency, interval, amount);
        subscription.gatewayPlanId = gatewayPlan.id;
        await subscription.save();
        const tx = await flutterwave.initializeTransaction({ email: req.user.email, name: req.user.name, amountNaira: amount, reference, redirectUrl: callbackUrl, currency, paymentPlanId: gatewayPlan.id, meta: { purpose: "subscription_initial", subscriptionId: String(subscription._id), userId: String(req.user._id), audience, interval } });
        checkoutUrl = tx.link;
      }
      return res.status(201).json({ message: "Subscription checkout initialized.", checkoutUrl, reference, subscriptionId: subscription._id, gateway, currency, amount, interval, audience });
    } catch (gatewayError) {
      await Payment.updateOne({ _id: payment._id, status: "pending" }, { status: "failed", "meta.initFailure": true });
      await Subscription.updateOne({ _id: subscription._id, status: "pending" }, { status: "expired", autoRenew: false, lastFailureCode: "checkout_initialization_failed" });
      throw gatewayError;
    }
  } catch (err) {
    console.error("[subscriptions] subscribe:", err.message);
    return res.status(502).json({ message: "Could not initialize subscription checkout." });
  }
}

async function activateFromVerifiedPayment(payment, verified, gateway) {
  const expectedAmount = Math.round(payment.amount * 100);
  const actualAmount = gateway === "paystack" ? Number(verified.amount) : Math.round(Number(verified.amount) * 100);
  const actualCurrency = String(verified.currency || "").toUpperCase();
  const statusOk = gateway === "paystack" ? verified.status === "success" : ["successful", "succeeded"].includes(verified.status);
  const referenceOk = gateway === "paystack" ? verified.reference === payment.reference : verified.tx_ref === payment.reference;
  if (!statusOk || !referenceOk || actualAmount !== expectedAmount || actualCurrency !== payment.currency) {
    throw new Error("Gateway transaction did not exactly match expected status, reference, amount and currency.");
  }

  const subId = payment.meta?.subscriptionId;
  let subscription = subId ? await Subscription.findById(subId).select("+paymentMethod.authorizationCiphertext +paymentMethod.authorizationIv +paymentMethod.authorizationTag") : null;
  if (!subscription && payment.purpose === "subscription_renewal") subscription = await Subscription.findOne({ lastPaymentReference: payment.reference });
  if (!subscription) throw new Error("Subscription record for verified payment was not found.");

  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: { $ne: "success" } }, { status: "success", "meta.verifiedAt": new Date() }, { new: true });
  if (!claimed) return subscription;

  const now = new Date();
  const isRenewal = payment.purpose === "subscription_renewal";
  const periodStart = isRenewal && subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
  subscription.status = subscription.cancelAtPeriodEnd ? "non_renewing" : "active";
  subscription.currentPeriodStart = periodStart;
  subscription.currentPeriodEnd = addMonthsClamped(periodStart, INTERVALS[subscription.interval].months);
  subscription.nextPaymentDate = subscription.currentPeriodEnd;
  subscription.nextRetryAt = null;
  subscription.graceUntil = null;
  subscription.retryCount = 0;
  subscription.lastFailureCode = null;
  subscription.lastPayment = payment._id;
  subscription.lastPaymentReference = payment.reference;
  subscription.billingLockUntil = null;

  if (gateway === "paystack" && !isRenewal) {
    const authorization = verified.authorization || {};
    if (authorization.reusable === true && authorization.authorization_code) {
      const encrypted = encryptSecret(authorization.authorization_code);
      subscription.paymentMethod = {
        ...encrypted, reusable: true, brand: authorization.brand || authorization.card_type,
        last4: authorization.last4, expMonth: authorization.exp_month, expYear: authorization.exp_year,
      };
      subscription.autoRenew = !subscription.cancelAtPeriodEnd;
    } else {
      subscription.autoRenew = false;
      subscription.lastFailureCode = "authorization_not_reusable";
    }
  }
  if (gateway === "flutterwave") subscription.autoRenew = !subscription.cancelAtPeriodEnd;
  await subscription.save();

  await notify({ userId: subscription.user, type: "payment", title: isRenewal ? "Subscription renewed" : "Subscription activated", message: isRenewal ? `Your ${subscription.interval} subscription renewal was successful.` : `Your ${subscription.interval} subscription is now active.`, link: "/dashboard/settings" });
  if (gateway === "paystack" && !isRenewal && !subscription.autoRenew) {
    await notify({ userId: subscription.user, type: "payment", title: "Automatic renewal unavailable", message: "Your payment succeeded, but the gateway did not return a reusable authorization. Your membership is active for this period; renew manually before it expires.", link: "/dashboard/settings" });
  }
  return subscription;
}

async function verifySubscriptionPayment(req, res) {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference, user: req.user._id, purpose: { $in: ["subscription_initial", "subscription_renewal"] } });
    if (!payment) return res.status(404).json({ message: "Subscription payment not found." });
    if (payment.status === "success") return res.json({ status: "success", payment });
    let verified;
    if (payment.provider === "paystack") verified = await paystack.verifyTransaction(payment.reference);
    else {
      const transactionId = req.query.transaction_id;
      if (!transactionId) return res.json({ status: "pending", payment });
      verified = await flutterwave.verifyById(transactionId);
    }
    const subscription = await activateFromVerifiedPayment(payment, verified, payment.provider);
    return res.json({ status: "success", payment: await Payment.findById(payment._id), subscription });
  } catch (err) {
    console.error("[subscriptions] verify:", err.message);
    return res.status(400).json({ message: "Payment has not been verified as successful yet." });
  }
}

async function handlePaystackChargeSuccess(reference) {
  const payment = await Payment.findOne({ reference, purpose: { $in: ["subscription_initial", "subscription_renewal"] } });
  if (!payment) return false;
  const verified = await paystack.verifyTransaction(reference);
  await activateFromVerifiedPayment(payment, verified, "paystack");
  return true;
}

async function handleFlutterwaveWebhook(payload) {
  const data = payload?.data || {};
  const eventType = payload?.type || payload?.event;
  if (eventType === "subscription.cancelled" || data.status === "deactivated") {
    const email = data.customer?.email;
    const planId = String(data.plan?.id || data.payment_plan || "");
    if (email) {
      const filter = { gateway: "flutterwave", gatewayEmail: email, status: { $in: ["active", "past_due", "non_renewing"] } };
      if (planId) filter.gatewayPlanId = planId;
      await Subscription.updateMany(filter, { $set: { status: "non_renewing", autoRenew: false, cancelAtPeriodEnd: true, cancelledAt: new Date() } });
    }
    return;
  }
  if (!data.id) return;
  const verified = await flutterwave.verifyById(data.id);
  const reference = verified.tx_ref;
  if (!reference) throw new Error("Flutterwave verification did not return tx_ref.");
  let payment = await Payment.findOne({ reference, purpose: { $in: ["subscription_initial", "subscription_renewal"] } });
  if (!payment) {
    const email = verified.customer?.email || data.customer?.email;
    const planId = String(verified.payment_plan || data.payment_plan || data.plan?.id || "");
    const filter = { gateway: "flutterwave", gatewayEmail: email, status: { $in: ["active", "past_due", "non_renewing"] } };
    if (planId) filter.gatewayPlanId = planId;
    if (Number.isFinite(Number(verified.amount))) filter.amount = Number(verified.amount);
    if (verified.currency) filter.currency = String(verified.currency).toUpperCase();
    const matches = await Subscription.find(filter).limit(2);
    if (matches.length !== 1) return; // fail closed if customer has ambiguous subscriptions
    const sub = matches[0];
    payment = await Payment.findOneAndUpdate({ reference }, { $setOnInsert: { user: sub.user, purpose: "subscription_renewal", provider: "flutterwave", amount: sub.amount, currency: sub.currency, status: "pending", reference, meta: { subscriptionId: String(sub._id), webhookCreated: true } } }, { new: true, upsert: true });
  }
  if (["successful", "succeeded"].includes(verified.status)) {
    await activateFromVerifiedPayment(payment, verified, "flutterwave");
  } else if (payment.status === "pending") {
    await Payment.updateOne({ _id: payment._id }, { status: "failed", "meta.failure": verified.status || "unsuccessful" });
    const sub = await Subscription.findById(payment.meta?.subscriptionId);
    if (sub && ["active", "past_due"].includes(sub.status)) {
      sub.status = "past_due";
      sub.retryCount = Number(sub.retryCount || 0) + 1;
      sub.lastFailureCode = String(verified.status || "charge_failed");
      await sub.save();
      if (sub.retryCount === 1 || sub.retryCount >= 3) await notify({ userId: sub.user, type: "payment", title: "Subscription payment needs attention", message: "Flutterwave could not complete your recurring charge. It may retry automatically; please check your card or bank balance.", link: "/dashboard/settings" });
    }
  }
}

async function cancelMySubscription(req, res) {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ message: "Subscription not found." });
    if (!["active", "past_due", "pending", "non_renewing"].includes(sub.status)) return res.status(400).json({ message: "This subscription cannot be cancelled in its current state." });
    if (sub.gateway === "flutterwave" && ["active", "past_due", "pending"].includes(sub.status)) {
      // Flutterwave owns the recurring mandate. This app cannot safely deactivate an individual mandate
      // through the current documented v3 endpoint; customer must use its gateway cancellation link/dashboard.
      // Do not falsely mark it cancelled. Return actionable instructions instead.
      return res.status(409).json({ message: "To stop Flutterwave's automatic card charges, use the cancellation link in Flutterwave's subscription reminder email or contact Marketplace support to cancel it in the Flutterwave dashboard. The app has not marked this subscription cancelled." });
    }
    sub.autoRenew = false;
    sub.cancelAtPeriodEnd = true;
    sub.status = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? "non_renewing" : "cancelled";
    sub.cancelledAt = new Date();
    sub.nextRetryAt = null;
    await sub.save();
    await notify({ userId: sub.user, type: "payment", title: "Subscription cancellation scheduled", message: "Your subscription will not renew. Access remains available until the end of the paid period.", link: "/dashboard/settings" });
    return res.json({ message: "Automatic renewal has been stopped. Access remains until the paid period ends.", subscription: sub });
  } catch (err) {
    console.error("[subscriptions] cancel:", err.message);
    return res.status(500).json({ message: "Could not cancel subscription." });
  }
}

async function requestRetry(req, res) {
  const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
  if (!sub) return res.status(404).json({ message: "Subscription not found." });
  if (sub.gateway !== "paystack" || sub.status !== "past_due" || !sub.autoRenew || !sub.paymentMethod?.reusable) return res.status(409).json({ message: "This subscription cannot be retried automatically. Update your payment method or contact support." });
  sub.nextRetryAt = new Date();
  await sub.save();
  return res.json({ message: "A renewal retry has been queued. You will be notified when it is processed." });
}

async function adminListSubscriptions(req, res) {
  try {
    const { status, gateway, audience } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;
    if (audience) filter.audience = audience;
    const subscriptions = await Subscription.find(filter).populate("user", "name email activeRole").populate("plan", "name tier").sort({ updatedAt: -1 }).limit(300);
    return res.json({ subscriptions });
  } catch (err) { return res.status(500).json({ message: "Could not fetch subscriptions." }); }
}

async function adminCancelSubscription(req, res) {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Subscription not found." });
    if (sub.gateway === "flutterwave" && ["active", "past_due", "pending"].includes(sub.status)) {
      return res.status(409).json({ message: "Cancel this individual Flutterwave mandate in the Flutterwave dashboard, then confirm through its cancellation webhook. Do not cancel the shared payment plan." });
    }
    sub.autoRenew = false;
    sub.cancelAtPeriodEnd = true;
    sub.status = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? "non_renewing" : "cancelled";
    sub.cancelledAt = new Date();
    sub.nextRetryAt = null;
    await sub.save();
    await notify({ userId: sub.user, type: "payment", title: "Subscription cancelled by support", message: "Marketplace support has stopped your subscription from renewing. Access remains until the paid period ends.", link: "/dashboard/settings" });
    return res.json({ message: "Subscription renewal stopped.", subscription: sub });
  } catch (err) { return res.status(500).json({ message: "Could not cancel subscription." }); }
}

module.exports = { getBillingCapabilities, getPlans, getFoundingMemberStatus, getMySubscription, getMyHistory, enrollNewUser, subscribe, verifySubscriptionPayment, handlePaystackChargeSuccess, handleFlutterwaveWebhook, cancelMySubscription, requestRetry, adminListSubscriptions, adminCancelSubscription, activateFromVerifiedPayment };
