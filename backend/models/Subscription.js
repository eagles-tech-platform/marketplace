const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  audience: { type: String, enum: ["customer", "provider"], required: true, default: "customer" },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: function () { return Boolean(this.gateway) && !["founding_free", "none"].includes(this.status); } },
  interval: { type: String, enum: ["monthly", "quarterly", "annual"], default: "monthly" },
  currency: { type: String, enum: ["NGN", "USD"], required: true, default: "NGN" },
  amount: { type: Number, min: 0, default: 0 },
  gateway: { type: String, enum: ["paystack", "flutterwave"] },
  status: { type: String, enum: ["pending", "active", "past_due", "non_renewing", "cancelled", "expired", "founding_free", "none"], default: "pending", index: true },
  autoRenew: { type: Boolean, default: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextPaymentDate: { type: Date, index: true },
  lastRenewalReminderAt: Date,
  nextRetryAt: Date,
  graceUntil: Date,
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 4 },
  lastPayment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  lastPaymentReference: String,
  gatewayCustomerId: String,
  gatewayPlanId: String,
  gatewaySubscriptionId: String,
  gatewayEmail: String,
  paymentMethod: {
    authorizationCiphertext: { type: String, select: false },
    authorizationIv: { type: String, select: false },
    authorizationTag: { type: String, select: false },
    reusable: { type: Boolean, default: false },
    brand: String,
    last4: String,
    expMonth: String,
    expYear: String,
  },
  billingLockUntil: { type: Date, default: null, index: true },
  lastFailureCode: String,
  cancelledAt: Date,
  isFoundingMember: { type: Boolean, default: false },
  foundingMemberNumber: Number,
  freeUntil: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

subscriptionSchema.index({ user: 1, audience: 1 }, { unique: true });
subscriptionSchema.index({ gateway: 1, gatewayEmail: 1, gatewayPlanId: 1, status: 1 });
subscriptionSchema.index({ status: 1, autoRenew: 1, nextPaymentDate: 1, nextRetryAt: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
