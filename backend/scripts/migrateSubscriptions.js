require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required.");
  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.collection("subscriptions");
  await collection.updateMany({ audience: { $exists: false } }, { $set: { audience: "customer" } });
  const indexes = await collection.indexes();
  const oldUniqueUserIndex = indexes.find((i) => i.unique && i.key?.user === 1 && Object.keys(i.key).length === 1);
  if (oldUniqueUserIndex) {
    await collection.dropIndex(oldUniqueUserIndex.name);
    console.log(`[migration] dropped legacy unique index ${oldUniqueUserIndex.name}`);
  }
  await collection.createIndex({ user: 1, audience: 1 }, { unique: true, name: "user_1_audience_1_unique" });
  await collection.createIndex({ gateway: 1, gatewayEmail: 1, gatewayPlanId: 1, status: 1 }, { name: "gateway_email_plan_status" });
  console.log("[migration] subscription indexes and legacy audience fields updated.");
  await mongoose.disconnect();
})().catch(async (err) => { console.error("[migration] failed:", err.message); await mongoose.disconnect().catch(() => {}); process.exit(1); });
