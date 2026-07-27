const mongoose = require("mongoose");

const verificationRequestSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Portfolio evidence submitted by the provider
    workImages: [{ type: String, required: true }], // photo URLs of past work
    notes: { type: String, default: "" }, // provider's own description of the images/experience

    // Live video-call scheduling with an admin
    preferredSlots: [{ type: Date }], // times the provider proposed
    scheduledCallAt: { type: Date }, // time an admin confirmed
    callMeetingLink: { type: String, default: "" }, // e.g. Google Meet/Zoom link set by admin
    callCompletedAt: { type: Date },

    // Payment for the badge (only charged/required once admin is ready to approve)
    badgeFeePaid: { type: Boolean, default: false },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    status: {
      type: String,
      enum: [
        "submitted",        // provider uploaded photos, awaiting call scheduling
        "call_scheduled",   // admin proposed/confirmed a call time
        "call_completed",   // call happened, awaiting admin decision
        "awaiting_payment",  // admin approved pending badge fee
        "approved",
        "rejected",
      ],
      default: "submitted",
    },
    adminNotes: { type: String, default: "" }, // internal notes / rejection reason
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationRequest", verificationRequestSchema);
