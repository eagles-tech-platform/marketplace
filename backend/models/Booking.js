const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    type: { type: String, enum: ["one_time", "ongoing"], required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    isTrialBooking: { type: Boolean, default: false },
    price: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
