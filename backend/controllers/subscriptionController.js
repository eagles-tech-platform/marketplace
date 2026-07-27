const SubscriptionPlan = require("../models/SubscriptionPlan");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const { claimNextSlot, getStatus: getFoundingStatus } = require("../models/FoundingMemberCounter");
const { currencyForState } = require("../utils/currency");
const { isLive } = require("../config/paymentConfig");
const { notify } = require("../utils/notify");

const DEFAULT_PLANS = [
  {
    name: "Basic",
    tier: "basic",
    role: "both",
    priceNgnMonthly: 1500,
    priceNgnYearly: 15000,
    priceUsdMonthly: 3,
    priceUsdYearly: 30,
    features: [
      "List up to 5 active services",
      "Standard placement in search results",
      "Email support",
    ],
  },
  {
    name: "Pro",
    tier: "pro",
    role: "both",
    priceNgnMonthly: 4000,
    priceNgnYearly: 40000,
    priceUsdMonthly: 8,
    priceUsdYearly: 80,
    features: [
      "Unlimited active services",
      "Priority placement in search & recommendations",
      "Verified badge fee discount",
      "Priority support",
    ],
  },
];

/** Creates the two default plans on first use — no separate seed step to remember. */
async function ensurePlansExist() {
  const count = await SubscriptionPlan.countDocuments();
  if (count === 0) {
    await SubscriptionPlan.insertMany(DEFAULT_PLANS);
  }
}

// GET /api/subscriptions/plans?state=Lagos  (public)
async function getPlans(req, res) {
  try {
    await ensurePlansExist();
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ priceNgnMonthly: 1 });
    const currency = currencyForState(req.query.state);
    return res.json({
      currency,
      plans: plans.map((p) => ({
        id: p._id,
        name: p.name,
        tier: p.tier,
        features: p.features,
        priceMonthly: currency === "NGN" ? p.priceNgnMonthly : p.priceUsdMonthly,
        priceYearly: currency === "NGN" ? p.priceNgnYearly : p.priceUsdYearly,
      })),
    });
  } catch (err) {
    console.error("[subscriptions] getPlans error:", err);
    return res.status(500).json({ message: "Could not fetch plans." });
  }
}

// GET /api/subscriptions/founding-status  (public) — powers the homepage popup/counter
async function getFoundingMemberStatus(req, res) {
  try {
    const status = await getFoundingStatus();
    return res.json(status);
  } catch (err) {
    console.error("[subscriptions] getFoundingMemberStatus error:", err);
    return res.status(500).json({ message: "Could not fetch founding member status." });
  }
}

// GET /api/subscriptions/mine  (protect)
async function getMySubscription(req, res) {
  try {
    const sub = await Subscription.findOne({ user: req.user._id }).populate("plan");
    return res.json({ subscription: sub });
  } catch (err) {
    console.error("[subscriptions] getMySubscription error:", err);
    return res.status(500).json({ message: "Could not fetch your subscription." });
  }
}

/**
 * Called once, at signup — claims a founding-member slot if any remain and
 * creates the user's Subscription record either way (free window, or
 * status "none" if the 1000 slots are already gone). Never throws; a
 * subscription hiccup shouldn't block account creation.
 */
async function enrollNewUser(user) {
  try {
    const claim = await claimNextSlot();
    if (claim) {
      const freeUntil = new Date();
      freeUntil.setMonth(freeUntil.getMonth() + claim.freeMonths);
      await Subscription.create({
        user: user._id,
        status: "founding_free",
        isFoundingMember: true,
        foundingMemberNumber: claim.slotNumber,
        freeUntil,
        currency: currencyForState(user.state),
      });
    } else {
      await Subscription.create({
        user: user._id,
        status: "none",
        currency: currencyForState(user.state),
      });
    }
  } catch (err) {
    console.error("[subscriptions] enrollNewUser failed:", err.message);
  }
}

// POST /api/subscriptions/subscribe  (protect)  body: { planId, interval, gateway }
async function subscribe(req, res) {
  try {
    const { planId, interval, gateway } = req.body;
    if (!planId || !["monthly", "yearly"].includes(interval)) {
      return res.status(400).json({ message: "planId and a valid interval are required." });
    }
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ message: "Plan not found." });

    const currency = currencyForState(req.user.state);
    const amount = currency === "NGN"
      ? (interval === "yearly" ? plan.priceNgnYearly : plan.priceNgnMonthly)
      : (interval === "yearly" ? plan.priceUsdYearly : plan.priceUsdMonthly);

    let sub = await Subscription.findOne({ user: req.user._id });
    if (!sub) sub = new Subscription({ user: req.user._id });

    const periodEnd = new Date();
    if (interval === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (!isLive()) {
      // Simulate mode — same pattern as the rest of the payment system:
      // resolves instantly so the flow is testable before real gateway keys exist.
      sub.plan = plan._id;
      sub.interval = interval;
      sub.currency = currency;
      sub.status = "active";
      sub.currentPeriodEnd = periodEnd;
      await sub.save();

      await notify({
        userId: req.user._id,
        type: "payment",
        title: `Subscribed to ${plan.name}`,
        message: `Your ${interval} ${plan.name} subscription is active (simulated — PAYMENTS_MODE=simulate).`,
        link: "/dashboard/settings",
      });

      return res.json({ message: "Subscribed successfully (simulated).", subscription: sub });
    }

    // Live mode: recurring billing needs Paystack/Flutterwave's dedicated
    // Plan + Subscription APIs (different from the one-off transaction
    // flow already built for bookings/slot fees) — that gateway wiring
    // isn't built yet. Flag clearly rather than silently charge once and
    // call it a subscription.
    return res.status(501).json({
      message:
        "Live recurring billing isn't wired up yet — only one-off payments (bookings, slot fees) support live mode so far. Subscriptions currently only work in PAYMENTS_MODE=simulate.",
    });
  } catch (err) {
    console.error("[subscriptions] subscribe error:", err);
    return res.status(500).json({ message: "Could not process subscription." });
  }
}

module.exports = {
  getPlans,
  getFoundingMemberStatus,
  getMySubscription,
  enrollNewUser,
  subscribe,
};
