/**
 * Creates the ONE super admin account. Run this once, right after you set
 * up the database — not an HTTP endpoint on purpose, so it can't be hit
 * over the network. It self-disables: if any admin account already
 * exists, it refuses to create another one, no matter how it's run again.
 *
 * Usage:
 *   ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-strong-password" node scripts/createSuperAdmin.js
 *
 * After running this once:
 *   1. Log in with that email/password.
 *   2. Immediately change the password from Settings → Security
 *      (POST /api/auth/change-password) — this script's job is done, the
 *      account itself is a completely normal login from then on.
 *   3. There is no "create another admin" feature anywhere in the app —
 *      by design, per the request that started this. If you ever
 *      genuinely need a second admin, it has to be done the same way:
 *      direct DB/script access, never through the API.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error("Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD environment variable(s).");
    console.error('Usage: ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/createSuperAdmin.js');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("[createSuperAdmin] Connected to MongoDB.");

  const existingAdmin = await User.findOne({ isAdmin: true });
  if (existingAdmin) {
    console.error(
      `[createSuperAdmin] Refusing to run — an admin account already exists (${existingAdmin.email}). ` +
        "This script is one-time only. If you've lost admin access, that's a deliberate recovery " +
        "process (direct database access), not something this script does for you."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    console.error(`[createSuperAdmin] A user with email ${email} already exists (as a non-admin account). Use a different email.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = new User({
    name,
    email: email.toLowerCase(),
    password,
    isAdmin: true,
    activeRole: "customer", // harmless placeholder — isAdmin is what actually grants admin access everywhere
    canBeCustomer: true,
    canBeProvider: false,
    isEmailVerified: true, // skip the email-verification step for this one bootstrap account
  });

  await admin.save();
  console.log(`[createSuperAdmin] Admin account created: ${admin.email}`);
  console.log("[createSuperAdmin] Log in, then change this password immediately from Settings → Security.");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[createSuperAdmin] Failed:", err);
  process.exit(1);
});
