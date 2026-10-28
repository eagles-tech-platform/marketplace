const express = require("express");
const rateLimit = require("express-rate-limit");
const {
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
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Basic brute-force protection on the sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please try again later." },
});

router.post("/register", authLimiter, register);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/login", authLimiter, login);
router.post("/verify-2fa", authLimiter, verifyTwoFactor);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/switch-role", protect, switchRole);
router.patch("/avatar", protect, updateAvatar);
router.post("/toggle-2fa", protect, toggleTwoFactor);
router.post("/change-password", protect, changePassword);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:id", protect, revokeSession);
router.patch("/update-profile", protect, updateProfile);

module.exports = router;
