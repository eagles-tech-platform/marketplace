
const mongoose = require("mongoose");

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, },
  tokenHash: { type: String, required: true, unique: true, select: false, },
  familyId: { type: String, required: true, },
  expiresAt: { type: Date, required: true, },
  revokedAt: { type: Date, default: null, },
  replacedByHash: { type: String, default: null, select: false, },
  userAgent: { type: String, maxlength: 500, },
  ipAddress: { type: String, maxlength: 100, },
}, { timestamps: true, });

// Efficient family-wide revocation.
refreshSessionSchema.index({ familyId: 1, revokedAt: 1,});

// Efficient retrieval of a user's active sessions.
refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1, });

// Automatically remove expired sessions.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.RefreshSession ||
  mongoose.model("RefreshSession", refreshSessionSchema);
