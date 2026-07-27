const mongoose = require("mongoose");

const founderCounterSchema = new mongoose.Schema({
  _id: { type: String, default: "founding_members" }, // fixed id — always exactly one document
  claimed: { type: Number, default: 0 },
});

const FoundingMemberCounter = mongoose.model("FoundingMemberCounter", founderCounterSchema);

const FIRST_TIER_LIMIT = 300; // 6 months free
const SECOND_TIER_LIMIT = 1000; // next 700 (positions 301-1000): 2 months free

/**
 * Atomically claims the next founding-member slot number, or returns null
 * if all 1000 are gone. Safe under concurrent signups — uses a single
 * $inc rather than read-then-write.
 */
async function claimNextSlot() {
  const doc = await FoundingMemberCounter.findOneAndUpdate(
    { _id: "founding_members" },
    { $inc: { claimed: 1 } },
    { upsert: true, new: true }
  );
  const slotNumber = doc.claimed;
  if (slotNumber > SECOND_TIER_LIMIT) {
    // Over the limit — undo the increment so the counter caps at 1000
    // rather than climbing forever past the point it means anything.
    await FoundingMemberCounter.updateOne({ _id: "founding_members" }, { $set: { claimed: SECOND_TIER_LIMIT } });
    return null;
  }
  const freeMonths = slotNumber <= FIRST_TIER_LIMIT ? 6 : 2;
  return { slotNumber, freeMonths };
}

async function getStatus() {
  const doc = await FoundingMemberCounter.findById("founding_members");
  const claimed = doc?.claimed || 0;
  return {
    claimed,
    totalSlots: SECOND_TIER_LIMIT,
    remaining: Math.max(0, SECOND_TIER_LIMIT - claimed),
    firstTierRemaining: Math.max(0, FIRST_TIER_LIMIT - Math.min(claimed, FIRST_TIER_LIMIT)),
    firstTierLimit: FIRST_TIER_LIMIT,
    secondTierLimit: SECOND_TIER_LIMIT,
  };
}

module.exports = { claimNextSlot, getStatus, FIRST_TIER_LIMIT, SECOND_TIER_LIMIT };
