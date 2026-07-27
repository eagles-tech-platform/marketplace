const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
    interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    currency: { type: String, enum: ["NGN", "USD"], default: "NGN" },

    status: {
      type: String,
      enum: [
        "founding_free", // in a free-of-charge founding-member window (see FoundingMemberCounter)
        "active", // real, paid subscription
        "expired", // free window or paid period ended, not renewed
        "none", // never subscribed — using the app without a plan at all
      ],
      default: "none",
    },

    // Founding-member free access
    isFoundingMember: { type: Boolean, default: false },
    foundingMemberNumber: { type: Number }, // e.g. 1-300 or 301-1000, for display ("Founding Member #47")
    freeUntil: { type: Date },

    // Paid billing period (once real payment is wired in — simulate mode
    // still uses these fields so the UI has real dates to show)
    currentPeriodEnd: { type: Date },
    lastPayment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
