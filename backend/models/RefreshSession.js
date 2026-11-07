const mongoose = require("mongoose");

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null, index: true },
    replacedByHash: { type: String, default: null, select: false },
    userAgent: { type: String, maxlength: 500 },
    ipAddress: { type: String, maxlength: 100 }
  },
  { timestamps: true }
);

refreshSessionSchema.index({ familyId: 1, revokedAt: 1 });
module.exports =
  mongoose.models.RefreshSession ||
  mongoose.model("RefreshSession", refreshSessionSchema);
