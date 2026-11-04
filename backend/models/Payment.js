const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    purpose: {
      type: String,
      enum: ["provider_slot", "recommendation_fee", "booking_payment", "verification_badge", "withdrawal"],
      required: true,
    },
    provider: { type: String, enum: ["paystack", "flutterwave", "bank_transfer"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
    reference: { type: String, unique: true, sparse: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// One pending withdrawal per user: closes the race where two simultaneous
// requests both pass the "available balance" check.
paymentSchema.index(
  { user: 1 },
  {
    unique: true,
    name: "one_pending_withdrawal_per_user",
    partialFilterExpression: { purpose: "withdrawal", status: "pending" },
  }
);
paymentSchema.index({ user: 1, purpose: 1, status: 1 });
paymentSchema.index({ booking: 1, purpose: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);