const User = require("../models/User");
const { notify } = require("../utils/notify");

// GET /api/admin/provider-applications  — providers pending approval
async function listProviderApplications(req, res) {
  try {
    const status = req.query.status || "pending";
    const applications = await User.find({
      canBeProvider: true,
      providerApprovalStatus: status,
    }).sort({ createdAt: -1 });
    return res.json({ applications: applications.map((a) => a.toSafeJSON()) });
  } catch (err) {
    console.error("[admin] listProviderApplications error:", err);
    return res.status(500).json({ message: "Could not fetch provider applications." });
  }
}

// PATCH /api/admin/provider-applications/:id/decide
// body: { decision: "approve" | "reject", reason? }
async function decideProviderApplication(req, res) {
  try {
    const { decision, reason } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'." });
    }
    const applicant = await User.findById(req.params.id);
    if (!applicant) return res.status(404).json({ message: "Applicant not found." });

    applicant.providerApprovalStatus = decision === "approve" ? "approved" : "rejected";
    await applicant.save();

    await notify({
      userId: applicant._id,
      type: "provider_approval",
      title: decision === "approve" ? "You're an approved provider!" : "Provider application declined",
      message:
        decision === "approve"
          ? "Your provider application has been approved. You can now list services."
          : reason || "Your provider application wasn't approved this time.",
      link: "/provider/settings",
    });

    return res.json({ message: `Application ${decision}d.`, applicant: applicant.toSafeJSON() });
  } catch (err) {
    console.error("[admin] decideProviderApplication error:", err);
    return res.status(500).json({ message: "Could not process decision." });
  }
}

// GET /api/admin/users — list all users, optional ?role= & ?search=
async function listUsers(req, res) {
  try {
    const filter = {};
    if (req.query.role === "provider") filter.canBeProvider = true;
    else if (req.query.role === "customer") filter.activeRole = "customer";
    else if (req.query.role === "admin") filter.isAdmin = true;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    console.error("[admin] listUsers error:", err);
    return res.status(500).json({ message: "Could not fetch users." });
  }
}

// PATCH /api/admin/users/:id/status  — activate/deactivate an account
// body: { isActive }
async function updateUserStatus(req, res) {
  try {
    const { isActive } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found." });
    if (targetUser.isAdmin) return res.status(403).json({ message: "Can't deactivate an admin account." });

    targetUser.isActive = !!isActive;
    await targetUser.save();
    return res.json({ message: `User ${isActive ? "activated" : "deactivated"}.`, user: targetUser.toSafeJSON() });
  } catch (err) {
    console.error("[admin] updateUserStatus error:", err);
    return res.status(500).json({ message: "Could not update user status." });
  }
}

// GET /api/admin/login-activity  (admin) — recent login attempts, flags IPs with repeated failures
async function getLoginActivity(req, res) {
  try {
    const LoginAttempt = require("../models/LoginAttempt");
    const attempts = await LoginAttempt.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "name email");

    // Flag any IP with 5+ failed attempts in the returned window — a simple,
    // transparent signal rather than an opaque "risk score."
    const failuresByIp = {};
    for (const a of attempts) {
      if (!a.success) failuresByIp[a.ip] = (failuresByIp[a.ip] || 0) + 1;
    }
    const suspiciousIps = Object.entries(failuresByIp)
      .filter(([, count]) => count >= 5)
      .map(([ip, count]) => ({ ip, failedAttempts: count }));

    return res.json({ attempts, suspiciousIps });
  } catch (err) {
    console.error("[admin] getLoginActivity error:", err);
    return res.status(500).json({ message: "Could not fetch login activity." });
  }
}

// GET /api/admin/dashboard-summary  (admin) — everything the admin landing page needs, all real
async function getDashboardSummary(req, res) {
  try {
    const User = require("../models/User");
    const Payment = require("../models/Payment");
    const Booking = require("../models/Booking");
    const Service = require("../models/Service");

    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalAdmins,
      pendingApprovalsCount,
      activeBookingsCount,
      successfulPayments,
      recentApplications,
      recentPayments,
      recentCompletedBookings,
      categoryAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ canBeCustomer: true }),
      User.countDocuments({ canBeProvider: true, providerApprovalStatus: "approved" }),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ canBeProvider: true, providerApprovalStatus: "pending" }),
      Booking.countDocuments({ status: { $in: ["pending", "confirmed", "in_progress"] } }),
      Payment.find({ status: "success" }),
      User.find({ canBeProvider: true, providerApprovalStatus: "pending" }).sort({ createdAt: -1 }).limit(5).select("name category createdAt"),
      Payment.find({ status: "success" }).sort({ createdAt: -1 }).limit(5).populate("user", "name"),
      Booking.find({ status: "completed" }).sort({ updatedAt: -1 }).limit(5).populate("customer", "name").populate("service", "title"),
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "svc" } },
        { $unwind: "$svc" },
        { $group: { _id: "$svc.category", bookings: { $sum: 1 }, revenue: { $sum: "$price" } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Platform's actual earnings: its cut of each booking payment (via
    // PLATFORM_FEE_PERCENT) plus the one-off charges that are 100% platform
    // revenue (slot fees, recommendation fees, badge fees) — not the gross
    // amount customers paid, which mostly goes to providers.
    const { PLATFORM_FEE_PERCENT } = require("../config/paymentConfig");
    let totalRevenue = 0;
    for (const p of successfulPayments) {
      if (p.purpose === "booking_payment") {
        totalRevenue += Math.round((p.amount * PLATFORM_FEE_PERCENT) / 100);
      } else if (p.purpose !== "withdrawal") {
        totalRevenue += p.amount;
      }
    }

    const recentActivity = [
      ...recentApplications.map((a) => ({
        text: `New provider application: ${a.name} (${a.category || "uncategorized"})`,
        date: a.createdAt,
        link: "/admin/approvals",
      })),
      ...recentPayments.map((p) => ({
        text: `Payment of ₦${p.amount.toLocaleString()} received (${p.purpose.replace(/_/g, " ")})`,
        date: p.createdAt,
        link: "/admin/payments",
      })),
      ...recentCompletedBookings.map((b) => ({
        text: `Booking "${b.service?.title || "service"}" completed for ${b.customer?.name || "a customer"}`,
        date: b.updatedAt,
        link: "/admin/bookings",
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    return res.json({
      totalUsers,
      totalCustomers,
      totalProviders,
      totalAdmins,
      totalRevenue,
      pendingApprovalsCount,
      activeBookingsCount,
      recentActivity,
      topCategories: categoryAgg.map((c) => ({ name: c._id, bookings: c.bookings, revenue: c.revenue })),
    });
  } catch (err) {
    console.error("[admin] getDashboardSummary error:", err);
    return res.status(500).json({ message: "Could not fetch dashboard summary." });
  }
}

// GET /api/admin/payments  (admin) — every payment on the platform, real summary numbers
async function listPayments(req, res) {
  try {
    const Payment = require("../models/Payment");
    const { PLATFORM_FEE_PERCENT } = require("../config/paymentConfig");

    const payments = await Payment.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    let totalRevenue = 0; // platform's actual earnings
    let totalPayouts = 0; // what providers actually received (booking payments minus the fee)
    let pendingPayouts = 0; // pending manual withdrawal requests
    let totalFees = 0; // the fee portion specifically, broken out from totalRevenue for clarity

    const allSuccessful = await Payment.find({ status: "success" });
    for (const p of allSuccessful) {
      if (p.purpose === "booking_payment") {
        const fee = Math.round((p.amount * PLATFORM_FEE_PERCENT) / 100);
        totalFees += fee;
        totalRevenue += fee;
        totalPayouts += p.amount - fee;
      } else if (p.purpose === "withdrawal") {
        totalPayouts += p.amount;
      } else {
        totalRevenue += p.amount; // slot fees, recommendation fees, badge fees — 100% platform revenue
      }
    }
    const pendingWithdrawals = await Payment.find({ purpose: "withdrawal", status: "pending" });
    pendingPayouts = pendingWithdrawals.reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      payments,
      summary: { totalRevenue, totalPayouts, pendingPayouts, totalFees },
    });
  } catch (err) {
    console.error("[admin] listPayments error:", err);
    return res.status(500).json({ message: "Could not fetch payments." });
  }
}

// GET /api/admin/bookings  (admin) — every booking on the platform, optional ?status=
async function listBookings(req, res) {
  try {
    const Booking = require("../models/Booking");
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const bookings = await Booking.find(filter)
      .populate("customer", "name")
      .populate("provider", "name")
      .populate("service", "title")
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ bookings });
  } catch (err) {
    console.error("[admin] listBookings error:", err);
    return res.status(500).json({ message: "Could not fetch bookings." });
  }
}

// POST /api/admin/notifications/broadcast  (admin)  body: { title, message, target, link? }
async function sendBroadcast(req, res) {
  try {
    const Broadcast = require("../models/Broadcast");
    const Notification = require("../models/Notification");
    const { title, message, target, link } = req.body;

    if (!title || !message || !["all", "customers", "providers"].includes(target)) {
      return res.status(400).json({ message: "title, message, and a valid target are required." });
    }

    const filter = {};
    if (target === "customers") filter.canBeCustomer = true;
    else if (target === "providers") filter.canBeProvider = true;
    // "all" — no filter, every user

    const recipients = await User.find(filter).select("_id");
    if (recipients.length === 0) {
      return res.status(400).json({ message: "No matching users to notify." });
    }

    const broadcast = await Broadcast.create({
      title,
      message,
      link: link || "",
      target,
      recipientCount: recipients.length,
      sentBy: req.user._id,
    });

    // Bulk-create one Notification per recipient — same shape every other
    // notification in the app uses, so it shows up in the same bell/list.
    const docs = recipients.map((r) => ({
      user: r._id,
      type: "announcement",
      title,
      message,
      link: link || "",
    }));
    await Notification.insertMany(docs);

    return res.status(201).json({ message: `Sent to ${recipients.length} user(s).`, broadcast });
  } catch (err) {
    console.error("[admin] sendBroadcast error:", err);
    return res.status(500).json({ message: "Could not send announcement." });
  }
}

// GET /api/admin/notifications/history  (admin)
async function getBroadcastHistory(req, res) {
  try {
    const Broadcast = require("../models/Broadcast");
    const broadcasts = await Broadcast.find().populate("sentBy", "name").sort({ createdAt: -1 }).limit(50);
    return res.json({ broadcasts });
  } catch (err) {
    console.error("[admin] getBroadcastHistory error:", err);
    return res.status(500).json({ message: "Could not fetch announcement history." });
  }
}

module.exports = {
  listProviderApplications,
  decideProviderApplication,
  listUsers,
  updateUserStatus,
  getLoginActivity,
  getDashboardSummary,
  listPayments,
  listBookings,
  sendBroadcast,
  getBroadcastHistory,
};
