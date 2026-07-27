const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set only if the email matched a real account
    success: { type: Boolean, required: true },
    reason: { type: String, default: "" }, // e.g. "wrong_password", "not_verified", "success"
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fast lookups for "how many recent failures from this IP" checks.
loginAttemptSchema.index({ ip: 1, createdAt: -1 });
loginAttemptSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema);
