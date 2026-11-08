const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const { enrollNewUser } = require("./subscriptionController");
const {
  COOKIE_NAME,
  cookieOptions,
  signAccessToken,
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshToken,
  revokeAllUserSessions,
  hashRefreshToken,
  configureUserLookup,
} = require("../services/tokenService");
const { getRefreshPepper } = require("../config/jwtKeyring");
const RefreshSession = require("../models/RefreshSession");
const {
  sendEmail,
  verificationEmailTemplate,
  otpEmailTemplate,
  passwordResetTemplate,
} = require("../utils/sendEmail");

const CLIENT_URL = () => process.env.CLIENT_URL;

configureUserLookup((id, options = {}) => {
  const query = User.findById(id).select("_id email activeRole isAdmin isActive disabled isEmailVerified");
  if (options.session) { query.session(options.session); }
  return query;
});

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearRefreshCookie(res) {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
}

async function issueAuthTokens(user, req, res) {
  // Generate the access token for the authenticated user.
  const accessToken = signAccessToken(user);
  // Validate refresh-token configuration and cookie settings.
  getRefreshPepper();
  const options = cookieOptions();
  // Create a new refresh session.
  const refresh = await createRefreshSession(user, req);
  // Store the refresh token in an HttpOnly cookie.
  res.cookie(COOKIE_NAME, refresh.rawToken, options);
  return { accessToken, tokenType: "Bearer", expiresIn: process.env.JWT_ACCESS_TTL || "15m" };
}

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
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email and password are required.", });

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      await logAttempt({ email, user, success: false, reason: "invalid_credentials", req, });
      return res.status(401).json({ message: "Invalid email or password.", });
    }
    if (!user.isActive) {
      await logAttempt({ email, user, success: false, reason: "account_deactivated", req, });
      return res.status(403).json({ message: "This account has been deactivated. Contact support.", });
    }
    if (!user.isEmailVerified) {
      await logAttempt({ email, user, success: false, reason: "not_verified", req, });
      return res.status(403).json({ message: "Please verify your email before logging in.", code: "EMAIL_NOT_VERIFIED", });
    }

    // Preserve existing two-factor authentication.
    if (user.twoFactorEnabled) {
      const otp = user.generateTwoFactorOTP();
      await user.save();

      try {
        await sendEmail({
          to: user.email, subject: "Your MARKET PLACE login code",
          html: otpEmailTemplate({ name: user.name, otp }),
        });
      } catch (mailErr) {
        console.error("[auth] Failed to send 2FA OTP email:", mailErr.message);
        return res.status(500).json({ message: "Could not send your login code. Try again shortly.", });
      }

      return res.json({ message: "A login code has been sent to your email.", requiresTwoFactor: true, email: user.email });
    }

    // Validate authentication configuration before changing login state.
    signAccessToken(user);
    getRefreshPepper();
    cookieOptions();

    // Record successful authentication.
    user.lastLoginAt = new Date();
    await user.save();
    // Issue tokens only after the account update succeeds.
    const tokens = await issueAuthTokens(user, req, res);
    await logAttempt({ email, user, success: true, reason: "success", req });
    return res.json({ message: "Logged in successfully.", user: user.toSafeJSON(), ...tokens });
  } catch (err) {
    console.error("[auth] login error:", err);
    return res.status(500).json({ message: "Something went wrong logging in.", });
  }
}

// POST /api/auth/verify-2fa
async function verifyTwoFactor(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and code are required."
      });
    }

    const hashed = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      twoFactorOTP: hashed,
      twoFactorOTPExpires: { $gt: Date.now() }
    }).select("+twoFactorOTP +twoFactorOTPExpires");

    if (!user) {
      await logAttempt({
        email,
        success: false,
        reason: "invalid_2fa_code",
        req
      });

      return res.status(400).json({
        message: "Invalid or expired code."
      });
    }

    // Check account status before accepting the OTP.
    if (
      !user.isActive ||
      user.disabled === true ||
      !user.isEmailVerified
    ) {
      await logAttempt({
        email,
        user,
        success: false,
        reason: "account_unavailable",
        req
      });

      return res.status(403).json({
        message: "This account is unavailable. Contact support."
      });
    }

    // Validate authentication configuration before consuming OTP.
    signAccessToken(user);
    getRefreshPepper();
    cookieOptions();

    // Consume the OTP after successful verification.
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpires = undefined;
    user.lastLoginAt = new Date();

    await user.save();

    const tokens = await issueAuthTokens(user, req, res);

    await logAttempt({
      email,
      user,
      success: true,
      reason: "success_2fa",
      req
    });

    return res.json({
      message: "Logged in successfully.",
      user: user.toSafeJSON(),
      ...tokens
    });

  } catch (err) {
    console.error("[auth] verifyTwoFactor error:", err);

    return res.status(500).json({
      message: "Could not verify code."
    });
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

// POST /api/auth/refresh — consumes the HttpOnly refresh cookie, rotates it,
// and returns a new short-lived access token.
async function refresh(req, res) {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (!rawToken) {
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Refresh token missing.",
        code: "REFRESH_MISSING"
      });
    }

    // Rotate the refresh token and obtain the new access token.
    const result = await rotateRefreshSession(rawToken, req);
    const user = result.user;

    if (!user || user.isActive === false || user.disabled === true) {
      await revokeRefreshToken(result.rawToken);
      clearRefreshCookie(res);

      return res.status(401).json({
        message: "Account is unavailable.",
        code: "ACCOUNT_UNAVAILABLE"
      });
    }

    // Reuse the access token generated by tokenService.
    const accessToken = result.accessToken;

    // Store the replacement refresh token.
    res.cookie(COOKIE_NAME, result.rawToken, cookieOptions());

    return res.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_ACCESS_TTL || "15m",
      user: user.toSafeJSON()
    });

  } catch (err) {
    if (
      ["REFRESH_REUSE", "REFRESH_INVALID", "ACCOUNT_UNAVAILABLE"].includes(err.code)
    ) {
      clearRefreshCookie(res);

      return res.status(401).json({
        message: err.message,
        code: err.code
      });
    }

    console.error("[auth] refresh error:", err);

    return res.status(500).json({
      message: "Could not refresh your session."
    });
  }
}

// POST /api/auth/logout — revokes this device's refresh token
async function logout(req, res) {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (rawToken) await revokeRefreshToken(rawToken);
  } catch (err) {
    console.error("[auth] logout error:", err.message);
  } finally {
    clearRefreshCookie(res);
  }
  return res.json({ message: "Logged out successfully." });
}

// POST /api/auth/logout-all  (requires auth) — signs out every device
async function logoutAll(req, res) {
  try {
    await revokeAllUserSessions(req.user._id);
    return res.json({ message: "Signed out on all devices." });
  } catch (err) {
    console.error("[auth] logoutAll error:", err);
    return res.status(500).json({ message: "Could not sign out all devices." });
  } finally {
    clearRefreshCookie(res);
  }
}

// POST /api/auth/change-password  (requires auth) — current password required
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({message: "Current and new passwords are required."});
    }
    if (newPassword.length < 8) {
      return res.status(400).json({message: "New password must be at least 8 characters."});
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect."});
    }
    // Validate authentication configuration first.
    signAccessToken(user);
    getRefreshPepper();
    cookieOptions();
    // Preserve existing User model password hashing middleware.
    user.password = newPassword;
    await user.save();
    // Invalidate all previous devices.
    await revokeAllUserSessions(user._id);
    // Issue fresh credentials for the current device.
    const tokens = await issueAuthTokens(user, req, res);
    return res.json({message: "Password changed successfully. Other devices have been signed out.", ...tokens});
  } catch (err) {
    console.error("[auth] changePassword error:", err);
    return res.status(500).json({
      message: "Could not change password."
    });
  }
}

// GET /api/auth/sessions  (requires auth) — this user's signed-in devices.
// Each device is one refresh "family"; exactly one live row exists per family.
async function getSessions(req, res) {
  try {
    const currentRaw = req.cookies?.[COOKIE_NAME];
    const currentHash = currentRaw
      ? hashRefreshToken(currentRaw)
      : null;

    const sessions = await RefreshSession.find({
      userId: req.user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    })
      .select("+tokenHash -replacedByHash")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      sessions: sessions.map((session) => ({
        id: session._id,
        ip: session.ipAddress,
        userAgent: session.userAgent,
        lastSeenAt: session.updatedAt,
        createdAt: session.createdAt,
        isCurrent:
          !!currentHash &&
          session.tokenHash === currentHash
      }))
    });

  } catch (err) {
    console.error("[auth] getSessions error:", err);

    return res.status(500).json({
      message: "Could not fetch sessions."
    });
  }
}

// DELETE /api/auth/sessions/:id  (requires auth) — sign out one device
async function revokeSession(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) { return res.status(404).json({ message: "Session not found." }); }
    const session = await RefreshSession.findOne({
      _id: id,
      userId: req.user._id
    }).select("_id familyId");
    if (!session) return res.status(404).json({ message: "Session not found." });
    await RefreshSession.updateMany(
      {
        familyId: session.familyId,
        userId: req.user._id,
        revokedAt: null
      },
      { $set: { revokedAt: new Date() } }
    );
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
    await revokeAllUserSessions(user._id);

    return res.json({ message: "Password reset successfully. All devices were signed out; please log in again." });
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

// PATCH /api/auth/update-profile  (requires auth)
async function updateProfile(req, res) {
  try {
    const { name, phoneNumber, state, city, category, niche, yearsOfExperience } = req.body;
    const user = req.user;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      user.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      const phone = String(phoneNumber).trim();
      // Allows +234..., 080..., with optional spaces/dashes; 7-15 digits
      if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid phone number." });
      }
      user.phoneNumber = phone;
    }

    if (state !== undefined) user.state = String(state).trim();
    if (city !== undefined) user.city = String(city).trim();

    // Provider-only fields
    const touchingProviderFields =
      category !== undefined || niche !== undefined || yearsOfExperience !== undefined;

    if (touchingProviderFields) {
      if (!user.canBeProvider) {
        return res.status(403).json({
          message: "Only service providers can update category, niche or experience.",
        });
      }
      if (category !== undefined) {
        if (!category) return res.status(400).json({ message: "Category cannot be empty." });
        user.category = category;
      }
      if (niche !== undefined) {
        if (!niche) return res.status(400).json({ message: "Niche cannot be empty." });
        user.niche = niche;
      }
      if (yearsOfExperience !== undefined) {
        const years = Number(yearsOfExperience);
        if (!Number.isFinite(years) || years < 0 || years > 70) {
          return res.status(400).json({ message: "Years of experience must be a valid number." });
        }
        user.yearsOfExperience = years;
      }
    }

    await user.save();
    return res.json({ message: "Profile updated.", user: user.toSafeJSON() });
  } catch (err) {
    console.error("[auth] updateProfile error:", err);
    return res.status(500).json({ message: "Could not update profile." });
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  verifyTwoFactor,
  toggleTwoFactor,
  refresh,
  logout,
  logoutAll,
  getMe,
  switchRole,
  forgotPassword,
  resetPassword,
  updateAvatar,
  changePassword,
  getSessions,
  revokeSession,
  updateProfile,
};
