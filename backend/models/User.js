const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    // --- Role handling ---
    // `activeRole` is the role the user is CURRENTLY operating as.
    // `canBeCustomer` / `canBeProvider` are permanent capability flags.
    // A user can only ever switch between customer <-> provider (never to admin).
    // These flags are set ONCE at signup and are never overwritten on login,
    // which is what fixes the "provider becomes customer after re-login" bug —
    // the old build re-derived role from an external OAuth session on every
    // login instead of reading the stored value.
    activeRole: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
      required: true,
    },
    canBeCustomer: { type: Boolean, default: true },
    canBeProvider: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    // --- Location ---
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },

    // --- Provider-specific (only relevant when canBeProvider is true) ---
    category: { type: String, trim: true },
    niche: { type: String, trim: true },
    yearsOfExperience: { type: String, trim: true },
    providerApprovalStatus: {
      type: String,
      enum: ["not_applicable", "pending", "approved", "rejected"],
      default: "not_applicable",
    },
    slotPaid: { type: Boolean, default: false },

    // --- Trust & Safety: "Verified Provider" badge ---
    // Since formal government ID isn't practical to require for most of the
    // 175+ trade niches here, verification is done via a live video call
    // with an admin plus a portfolio of past-work photos, and is a paid
    // add-on badge rather than a signup requirement.
    isVerifiedBadge: { type: Boolean, default: false },
    verifiedBadgeAt: { type: Date },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // --- Provider payout details (needed for automatic split payments) ---
    // A provider must add these before they can receive booking payments
    // with the platform fee auto-deducted at the gateway level.
    bankAccount: {
      bankCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      accountName: { type: String, trim: true }, // returned by the gateway on resolve, not user-typed
    },
    paystackSubaccountCode: { type: String, trim: true },
    flutterwaveSubaccountId: { type: String, trim: true },

    avatar: { type: String, default: "" },

    // --- Trial ---
    trialBookingsRemaining: { type: Number, default: 3 },

    // --- Email verification ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // --- Two-factor authentication (email OTP based) ---
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOTP: { type: String, select: false },
    twoFactorOTPExpires: { type: Date, select: false },

    // --- Password reset ---
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateEmailVerificationToken = function generateEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return rawToken;
};

userSchema.methods.generateTwoFactorOTP = function generateTwoFactorOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.twoFactorOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.twoFactorOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

userSchema.methods.generatePasswordResetToken = function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
  return rawToken;
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phoneNumber: this.phoneNumber,
    activeRole: this.activeRole,
    canBeCustomer: this.canBeCustomer,
    canBeProvider: this.canBeProvider,
    isAdmin: this.isAdmin,
    state: this.state,
    city: this.city,
    category: this.category,
    niche: this.niche,
    yearsOfExperience: this.yearsOfExperience,
    providerApprovalStatus: this.providerApprovalStatus,
    isVerifiedBadge: this.isVerifiedBadge,
    hasPayoutAccount: !!(this.paystackSubaccountCode || this.flutterwaveSubaccountId),
    ratingAvg: this.ratingAvg,
    ratingCount: this.ratingCount,
    isActive: this.isActive,
    avatar: this.avatar,
    trialBookingsRemaining: this.trialBookingsRemaining,
    isEmailVerified: this.isEmailVerified,
    twoFactorEnabled: this.twoFactorEnabled,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
