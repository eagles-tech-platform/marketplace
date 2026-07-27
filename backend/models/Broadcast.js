const mongoose = require("mongoose");

const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    target: { type: String, enum: ["all", "customers", "providers"], required: true },
    recipientCount: { type: Number, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Broadcast", broadcastSchema);
