const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const LoginAttempt = require("../models/LoginAttempt");
const { enrollNewUser } = require("./subscriptionController");
const { sendTokenCookie, clearTokenCookie } = require("../utils/generateToken");
const {
  sendEmail,
  verificationEmailTemplate,
  otpEmailTemplate,
  passwordResetTemplate,
} = require("../utils/sendEmail");

const CLIENT_URL = () => process.env.CLIENT_URL || "http://localhost:5173";

function requestMeta(req) {
  return { ip: req.ip || "", userAgent: req.headers["user-agent"] || "" };
}

/** Logs a login attempt (success or failure) — never throws, this must not
 * break the actual login flow if logging itself has an issue. */
async function logAttempt({ email, user, success, reason, req }) {
  try {
    const { ip, userAgent } = requestMeta(req);
    await LoginAttempt.create({ email, user: user?._id, success, reason, ip, userAgent });
  } catch (err) {
    console.error("[auth] logAttempt failed:", err.message);
  }
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const {
      name,
      email,
      phoneNumber,
      password,
      role, // "customer" | "provider"
      state,
      city,
      category,
      niche,
      yearsOfExperience,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required." });
    }
    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({ message: "Role must be customer or provider." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    if (role === "provider" && (!category || !niche)) {
      return res.status(400).json({ message: "Category and niche are required for service providers." });
    }

    const user = new User({
      name,
      email,
      phoneNumber,
      password,
      activeRole: role,
      canBeCustomer: true, // everyone can always act as a customer
      canBeProvider: role === "provider",
      state,
      city,
      category: role === "provider" ? category : undefined,
      niche: role === "provider" ? niche : undefined,
      yearsOfExperience: role === "provider" ? yearsOfExperience : undefined,
      providerApprovalStatus: role === "provider" ? "pending" : "not_applicable",
    });

    const rawToken = user.generateEmailVerificationToken();
    await user.save();
    await enrollNewUser(user);

    const verifyUrl = `${CLIENT_URL()}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your MARKET PLACE account",
        html: verificationEmailTemplate({ name: user.name, verifyUrl }),
      });
    } catch (mailErr) {
      console.error("[auth] Failed to send verification email:", mailErr.message);
      return res.status(201).json({
        message:
          "Account created, but the verification email could not be sent. Contact support or use 'resend verification'.",
        user: user.toSafeJSON(),
        emailSent: false,
      });
    }

    return res.status(201).json({
      message: "Account created. Please check your email to verify your account before logging in.",
      user: user.toSafeJSON(),
      emailSent: true,
    });
  } catch (err) {
    console.error("[auth] register error:", err);
    return res.status(500).json({ message: "Something went wrong creating your account." });
  }
}

// GET /api/auth/verify-email?token=...&email=...
async function verifyEmail(req, res) {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ message: "Missing verification token or email." });
    }
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({ message: "Verification link is invalid or has expired." });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error("[auth] verifyEmail error:", err);
    return res.status(500).json({ message: "Could not verify email." });
  }
}

// POST /api/auth/resend-verification
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) {
      // Don't reveal whether the account exists
      return res.json({ message: "If that account exists, a verification email has been sent." });
    }
    if (user.isEmailVerified) {
      return res.json({ message: "This account is already verified." });
    }
    const rawToken = user.generateEmailVerificationToken();
    await user.save();
    const verifyUrl = `${CLIENT_URL()}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendEmail({
      to: user.email,
      subject: "Verify your MARKET PLACE account",
      html: verificationEmailTemplate({ name: user.name, verifyUrl }),
    });
    return res.json({ message: "Verification email sent." });
  } catch (err) {
    console.error("[auth] resendVerification error:", err);
    return res.status(500).json({ message: "Could not resend verification email." });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      await logAttempt({ email, user, success: false, reason: "invalid_credentials", req });
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (!user.isActive) {
      await logAttempt({ email, user, success: false, reason: "account_deactivated", req });
      return res.status(403).json({ message: "This account has been deactivated. Contact support." });
    }
    if (!user.isEmailVerified) {
      await logAttempt({ email, user, success: false, reason: "not_verified", req });
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (user.twoFactorEnabled) {
      const otp = user.generateTwoFactorOTP();
      await user.save();
      try {
        await sendEmail({
          to: user.email,
          subject: "Your MARKET PLACE login code",
          html: otpEmailTemplate({ name: user.name, otp }),
        });
      } catch (mailErr) {
        console.error("[auth] Failed to send 2FA OTP email:", mailErr.message);
        return res.status(500).json({ message: "Could not send your login code. Try again shortly." });
      }
      // Not a completed login yet — the real success/session gets logged
      // once verifyTwoFactor succeeds, not here.
      return res.json({
        message: "A login code has been sent to your email.",
        requiresTwoFactor: true,
        email: user.email,
      });
    }

    // No 2FA — log in directly
    await sendTokenCookie(res, user._id, req);
    user.lastLoginAt = new Date();
    await user.save();
    await logAttempt({ email, user, success: true, reason: "success", req });
    return res.json({ message: "Logged in successfully.", user: user.toSafeJSON() });
  } catch (err) {
    console.error("[auth] login error:", err);
    return res.status(500).json({ message: "Something went wrong logging in." });
  }
}

// POST /api/auth/verify-2fa
async function verifyTwoFactor(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required." });
    }
    const hashed = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase(),
      twoFactorOTP: hashed,
      twoFactorOTPExpires: { $gt: Date.now() },
    }).select("+twoFactorOTP +twoFactorOTPExpires");

    if (!user) {
      await logAttempt({ email, success: false, reason: "invalid_2fa_code", req });
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpires = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    await sendTokenCookie(res, user._id, req);
    await logAttempt({ email, user, success: true, reason: "success_2fa", req });
    return res.json({ message: "Logged in successfully.", user: user.toSafeJSON() });
  } catch (err) {
    console.error("[auth] verifyTwoFactor error:", err);
    return res.status(500).json({ message: "Could not verify code." });
  }
}

// POST /api/auth/toggle-2fa  (requires auth)
async function toggleTwoFactor(req, res) {
  try {
    req.user.twoFactorEnabled = !req.user.twoFactorEnabled;
    await req.user.save();
    return res.json({
      message: req.user.twoFactorEnabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
      twoFactorEnabled: req.user.twoFactorEnabled,
    });
  } catch (err) {
    console.error("[auth] toggleTwoFactor error:", err);
    return res.status(500).json({ message: "Could not update two-factor settings." });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    const cookieName = process.env.JWT_COOKIE_NAME || "mp_token";
    const token = req.cookies?.[cookieName];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti) {
          await Session.findOneAndUpdate({ jti: decoded.jti }, { revokedAt: new Date() });
        }
      } catch {
        // token already invalid/expired — nothing to revoke, still clear the cookie below
      }
    }
  } finally {
    clearTokenCookie(res);
  }
  return res.json({ message: "Logged out successfully." });
}

// POST /api/auth/change-password  (requires auth) — current password required
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    user.password = newPassword;
    await user.save();
    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("[auth] changePassword error:", err);
    return res.status(500).json({ message: "Could not change password." });
  }
}

// GET /api/auth/sessions  (requires auth) — this user's active devices/sessions
async function getSessions(req, res) {
  try {
    const sessions = await Session.find({ user: req.user._id, revokedAt: null }).sort({ lastSeenAt: -1 });
    return res.json({
      sessions: sessions.map((s) => ({
        id: s._id,
        ip: s.ip,
        userAgent: s.userAgent,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
        isCurrent: s.jti === req.sessionJti,
      })),
    });
  } catch (err) {
    console.error("[auth] getSessions error:", err);
    return res.status(500).json({ message: "Could not fetch sessions." });
  }
}

// DELETE /api/auth/sessions/:id  (requires auth) — sign out one specific device
async function revokeSession(req, res) {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found." });
    session.revokedAt = new Date();
    await session.save();
    return res.json({ message: "Device signed out." });
  } catch (err) {
    console.error("[auth] revokeSession error:", err);
    return res.status(500).json({ message: "Could not sign out that device." });
  }
}

// GET /api/auth/me  (requires auth)
async function getMe(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}

// POST /api/auth/switch-role  (requires auth)
// Lets a user flip between customer <-> provider ONLY. Never touches isAdmin.
async function switchRole(req, res) {
  try {
    const { role } = req.body;
    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({ message: "You can only switch between customer and provider." });
    }
    if (req.user.isAdmin) {
      return res.status(403).json({ message: "Admin accounts cannot switch roles." });
    }
    if (role === "provider" && !req.user.canBeProvider) {
      return res.status(403).json({
        message: "You need to complete provider onboarding (category, niche, slot payment) before switching to provider.",
        code: "PROVIDER_ONBOARDING_REQUIRED",
      });
    }
    req.user.activeRole = role;
    await req.user.save();
    return res.json({ message: `Switched to ${role} mode.`, user: req.user.toSafeJSON() });
  } catch (err) {
    console.error("[auth] switchRole error:", err);
    return res.status(500).json({ message: "Could not switch role." });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) {
      return res.json({ message: "If that account exists, a reset link has been sent." });
    }
    const rawToken = user.generatePasswordResetToken();
    await user.save();
    const resetUrl = `${CLIENT_URL()}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your MARKET PLACE password",
      html: passwordResetTemplate({ name: user.name, resetUrl }),
    });
    return res.json({ message: "If that account exists, a reset link has been sent." });
  } catch (err) {
    console.error("[auth] forgotPassword error:", err);
    return res.status(500).json({ message: "Could not process password reset request." });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: "Token, email and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("[auth] resetPassword error:", err);
    return res.status(500).json({ message: "Could not reset password." });
  }
}

// PATCH /api/auth/avatar  (requires auth)
async function updateAvatar(req, res) {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: "avatar URL is required." });
    req.user.avatar = avatar;
    await req.user.save();
    return res.json({ message: "Avatar updated.", user: req.user.toSafeJSON() });
  } catch (err) {
    console.error("[auth] updateAvatar error:", err);
    return res.status(500).json({ message: "Could not update avatar." });
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  verifyTwoFactor,
  toggleTwoFactor,
  logout,
  getMe,
  switchRole,
  forgotPassword,
  resetPassword,
  updateAvatar,
  changePassword,
  getSessions,
  revokeSession,
};
