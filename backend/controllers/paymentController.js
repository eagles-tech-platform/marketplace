const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Booking = require("../models/Booking");
const VerificationRequest = require("../models/VerificationRequest");
const RecommendationRequest = require("../models/RecommendationRequest");
const { matchProviders } = require("./recommendationController");
const { PLATFORM_FEE_PERCENT, isLive } = require("../config/paymentConfig");
const paystack = require("../services/paystack");
const flutterwave = require("../services/flutterwave");
const { notify } = require("../utils/notify");

function generateReference(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// Fixed prices for the non-booking purposes. Move these to env/config the
// moment you know the real amounts — placeholders for now.
const FIXED_AMOUNTS = {
  provider_slot: Number(process.env.PROVIDER_SLOT_FEE_NGN || 5000),
  recommendation_fee: Number(process.env.RECOMMENDATION_FEE_NGN || 1000),
  verification_badge: Number(process.env.VERIFICATION_BADGE_FEE_NGN || 3000),
};

/**
 * Runs whatever should happen when a payment is confirmed successful —
 * called from both the simulate path AND the real webhook handlers, so the
 * side effects are identical either way (only the trigger differs).
 */
async function applyPaymentSuccess(payment) {
  if (payment.status === "success") return; // idempotent — webhooks can fire more than once
  payment.status = "success";
  await payment.save();

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
        const booking = await Booking.findByIdAndUpdate(
          payment.booking,
          { paymentStatus: "paid", payment: payment._id },
          { new: true }
        ).populate("service", "title");
        if (booking) {
          await notify({
            userId: booking.provider,
            type: "payment",
            title: "Payment received",
            message: `Payment for "${booking.service?.title || "a booking"}" has been received.`,
            link: "/provider/bookings",
          });
        }
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
}

// POST /api/payments/initialize  (any authenticated user)
// body: { purpose, gateway: "paystack"|"flutterwave", bookingId? }
async function initializePayment(req, res) {
  try {
    const { purpose, gateway, bookingId, recommendationRequestId } = req.body;
    const validPurposes = ["provider_slot", "recommendation_fee", "booking_payment", "verification_badge"];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ message: `purpose must be one of: ${validPurposes.join(", ")}` });
    }
    if (!["paystack", "flutterwave"].includes(gateway)) {
      return res.status(400).json({ message: "gateway must be paystack or flutterwave." });
    }

    let amount;
    let booking = null;
    let subaccountCode = null; // only set for booking_payment, so the split happens automatically
    let recommendationRequest = null;

    if (purpose === "recommendation_fee") {
      if (!recommendationRequestId) {
        return res.status(400).json({ message: "recommendationRequestId is required for recommendation_fee." });
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
      if (!bookingId) return res.status(400).json({ message: "bookingId is required for booking_payment." });
      booking = await Booking.findById(bookingId).populate("provider");
      if (!booking) return res.status(404).json({ message: "Booking not found." });
      if (String(booking.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "This isn't your booking." });
      }
      if (booking.paymentStatus === "paid") {
        return res.status(400).json({ message: "This booking has already been paid for." });
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
      amount = FIXED_AMOUNTS[purpose];
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
        recommendationRequestId: recommendationRequest ? String(recommendationRequest._id) : undefined,
      },
    });

    // --- SIMULATE MODE: no real gateway involved, resolve immediately ---
    if (!isLive()) {
      await applyPaymentSuccess(payment);
      return res.json({
        message: "Payment simulated successfully (PAYMENTS_MODE=simulate).",
        simulated: true,
        payment,
      });
    }

    // --- LIVE MODE: real Paystack/Flutterwave call ---
    const callbackUrl = `${process.env.CLIENT_URL}/payments/callback?reference=${reference}`;
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
    } else {
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
    }
  } catch (err) {
    console.error("[payments] initializePayment error:", err);
    return res.status(500).json({ message: err.message || "Could not start payment." });
  }
}

// GET /api/payments/verify/:reference  (frontend callback page polls this)
async function verifyPayment(req, res) {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference });
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (String(payment.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your payment." });
    }

    if (payment.status === "success" || !isLive()) {
      return res.json({ payment });
    }

    // Double-check with the real gateway rather than trusting the redirect alone
    if (payment.provider === "paystack") {
      const tx = await paystack.verifyTransaction(payment.reference);
      if (tx.status === "success") await applyPaymentSuccess(payment);
    } else if (payment.provider === "flutterwave") {
      // Flutterwave verify needs their transaction id, not our reference —
      // in live mode this should be passed back on the redirect as
      // `transaction_id` and verified at that point; left as a follow-up
      // wiring step once you're actually in live mode.
    }

    const refreshed = await Payment.findById(payment._id);
    return res.json({ payment: refreshed });
  } catch (err) {
    console.error("[payments] verifyPayment error:", err);
    return res.status(500).json({ message: "Could not verify payment." });
  }
}

// POST /api/payments/webhook/paystack
async function paystackWebhook(req, res) {
  try {
    const signature = req.headers["x-paystack-signature"];
    if (!paystack.verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ message: "Invalid signature." });
    }
    const event = req.body;
    if (event.event === "charge.success") {
      const payment = await Payment.findOne({ reference: event.data.reference });
      if (payment) await applyPaymentSuccess(payment);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("[payments] paystackWebhook error:", err);
    return res.sendStatus(500);
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
    if (event.status === "successful" || event.data?.status === "successful") {
      const reference = event.txRef || event.data?.tx_ref;
      const payment = await Payment.findOne({ reference });
      if (payment) await applyPaymentSuccess(payment);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("[payments] flutterwaveWebhook error:", err);
    return res.sendStatus(500);
  }
}

// --- Provider payout account onboarding ---

// GET /api/payments/banks?gateway=paystack|flutterwave
async function getBanks(req, res) {
  try {
    const gateway = req.query.gateway === "flutterwave" ? flutterwave : paystack;
    const banks = await gateway.listBanks();
    return res.json({ banks });
  } catch (err) {
    console.error("[payments] getBanks error:", err);
    return res.status(500).json({ message: err.message || "Could not fetch bank list." });
  }
}

// POST /api/payments/payout-account  (provider)
// body: { gateway, bankCode, bankName, accountNumber }
async function addPayoutAccount(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers need a payout account." });
    }
    const { gateway, bankCode, bankName, accountNumber } = req.body;
    if (!["paystack", "flutterwave"].includes(gateway) || !bankCode || !accountNumber) {
      return res.status(400).json({ message: "gateway, bankCode and accountNumber are required." });
    }

    let accountName = req.user.name; // fallback if we can't resolve (simulate mode)
    let subaccountField;
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
      subaccountValue = gateway === "paystack" ? sub.subaccount_code : sub.id;
    }

    subaccountField = gateway === "paystack" ? "paystackSubaccountCode" : "flutterwaveSubaccountId";

    req.user.bankAccount = { bankCode, bankName, accountNumber, accountName };
    req.user[subaccountField] = String(subaccountValue);
    await req.user.save();

    return res.json({ message: "Payout account added.", user: req.user.toSafeJSON() });
  } catch (err) {
    console.error("[payments] addPayoutAccount error:", err);
    return res.status(500).json({ message: err.message || "Could not add payout account." });
  }
}

// GET /api/payments/earnings  (provider) — their real transaction history + totals
async function getMyEarnings(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers have earnings." });
    }

    const payments = await Payment.find({
      purpose: "booking_payment",
      status: "success",
    })
      .populate({
        path: "booking",
        match: { provider: req.user._id },
        populate: [
          { path: "service", select: "title" },
          { path: "customer", select: "name" },
        ],
      })
      .sort({ createdAt: -1 });

    // populate with a match filters at the DB level for the ref, but Mongoose
    // still returns the parent Payment doc with booking: null when it didn't
    // match — filter those out here.
    const mine = payments.filter((p) => p.booking);

    const platformFeePercent = PLATFORM_FEE_PERCENT;
    const transactions = mine.map((p) => {
      const fee = Math.round((p.amount * platformFeePercent) / 100);
      return {
        id: p._id,
        date: p.createdAt,
        customer: p.booking.customer?.name || "Customer",
        service: p.booking.service?.title || "Service",
        amount: p.amount,
        fee,
        net: p.amount - fee,
        status: "completed",
      };
    });

    const totalEarnings = transactions.reduce((sum, t) => sum + t.net, 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);

    // group by month for the overview panel
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

// --- Manual withdrawal requests ---
// Fallback path for when a provider needs money moved manually — e.g. a
// booking was paid before they'd added a payout account, or an automatic
// split failed. Uses the existing Payment model's "withdrawal" purpose;
// these are reviewed and settled by an admin outside the gateway, not
// auto-processed.

// POST /api/payments/withdrawals  (provider)
async function requestWithdrawal(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers can request a withdrawal." });
    }
    const { amount, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "A valid amount is required." });
    }

    const reference = generateReference("withdrawal");
    const withdrawal = await Payment.create({
      user: req.user._id,
      purpose: "withdrawal",
      provider: "bank_transfer",
      amount,
      status: "pending",
      reference,
      meta: { note: note || "", bankAccount: req.user.bankAccount || null },
    });

    return res.status(201).json({ message: "Withdrawal request submitted for review.", withdrawal });
  } catch (err) {
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
    if (req.query.status) filter.status = req.query.status;
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
    const { decision, reason } = req.body;
    if (!["paid", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'paid' or 'reject'." });
    }
    const withdrawal = await Payment.findById(req.params.id);
    if (!withdrawal || withdrawal.purpose !== "withdrawal") {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }
    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "This request has already been resolved." });
    }

    withdrawal.status = decision === "paid" ? "success" : "failed";
    withdrawal.meta = { ...withdrawal.meta, adminReason: reason || "" };
    await withdrawal.save();

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
