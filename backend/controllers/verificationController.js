const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const { notify } = require("../utils/notify");

// POST /api/verification/requests  (provider)
async function createRequest(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only service providers can request verification." });
    }
    const { workImages, notes, preferredSlots } = req.body;
    if (!Array.isArray(workImages) || workImages.length === 0) {
      return res.status(400).json({ message: "Please include at least one photo of past work." });
    }

    const existing = await VerificationRequest.findOne({
      provider: req.user._id,
      status: { $nin: ["approved", "rejected"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "You already have a verification request in progress.",
        request: existing,
      });
    }

    const request = await VerificationRequest.create({
      provider: req.user._id,
      workImages,
      notes: notes || "",
      preferredSlots: Array.isArray(preferredSlots) ? preferredSlots : [],
      status: "submitted",
    });

    return res.status(201).json({ message: "Verification request submitted.", request });
  } catch (err) {
    console.error("[verification] createRequest error:", err);
    return res.status(500).json({ message: "Could not submit verification request." });
  }
}

// GET /api/verification/requests/me  (provider) — their own request status
async function getMyRequest(req, res) {
  try {
    const request = await VerificationRequest.findOne({ provider: req.user._id }).sort({ createdAt: -1 });
    return res.json({ request: request || null });
  } catch (err) {
    console.error("[verification] getMyRequest error:", err);
    return res.status(500).json({ message: "Could not fetch verification status." });
  }
}

// GET /api/verification/requests  (admin) — list, optional ?status=
async function listRequests(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await VerificationRequest.find(filter)
      .populate("provider", "name email phoneNumber category niche avatar")
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    console.error("[verification] listRequests error:", err);
    return res.status(500).json({ message: "Could not fetch verification requests." });
  }
}

// PATCH /api/verification/requests/:id/schedule-call  (admin)
async function scheduleCall(req, res) {
  try {
    const { scheduledCallAt, callMeetingLink } = req.body;
    if (!scheduledCallAt) {
      return res.status(400).json({ message: "scheduledCallAt is required." });
    }
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Verification request not found." });

    request.scheduledCallAt = new Date(scheduledCallAt);
    request.callMeetingLink = callMeetingLink || "";
    request.status = "call_scheduled";
    await request.save();

    await notify({
      userId: request.provider,
      type: "verification",
      title: "Verification call scheduled",
      message: `Your video call is scheduled for ${new Date(scheduledCallAt).toLocaleString()}.`,
      link: "/provider/settings",
    });

    return res.json({ message: "Call scheduled.", request });
  } catch (err) {
    console.error("[verification] scheduleCall error:", err);
    return res.status(500).json({ message: "Could not schedule call." });
  }
}

// PATCH /api/verification/requests/:id/complete-call  (admin)
async function completeCall(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Verification request not found." });

    request.callCompletedAt = new Date();
    request.status = "call_completed";
    await request.save();

    return res.json({ message: "Call marked as completed.", request });
  } catch (err) {
    console.error("[verification] completeCall error:", err);
    return res.status(500).json({ message: "Could not update request." });
  }
}

// PATCH /api/verification/requests/:id/decide  (admin) — approve or reject
async function decide(req, res) {
  try {
    const { decision, adminNotes, requireBadgeFee } = req.body; // decision: "approve" | "reject"
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'." });
    }
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Verification request not found." });

    request.adminNotes = adminNotes || "";
    request.reviewedBy = req.user._id;

    if (decision === "reject") {
      request.status = "rejected";
      await request.save();
      await notify({
        userId: request.provider,
        type: "verification",
        title: "Verification request declined",
        message: adminNotes || "Your verification request was not approved this time.",
        link: "/provider/settings",
      });
      return res.json({ message: "Request rejected.", request });
    }

    // Approve path — either require badge fee payment first, or grant immediately
    if (requireBadgeFee && !request.badgeFeePaid) {
      request.status = "awaiting_payment";
      await request.save();
      await notify({
        userId: request.provider,
        type: "verification",
        title: "Verification approved — pay to activate your badge",
        message: "You're approved! Complete the badge fee payment to activate your Verified badge.",
        link: "/provider/settings",
      });
      return res.json({ message: "Approved, awaiting badge fee payment.", request });
    }

    request.status = "approved";
    await request.save();
    await User.findByIdAndUpdate(request.provider, {
      isVerifiedBadge: true,
      verifiedBadgeAt: new Date(),
    });
    await notify({
      userId: request.provider,
      type: "verification",
      title: "You're now a Verified Provider!",
      message: "Your Verified badge is live on your profile and services.",
      link: "/provider/settings",
    });

    return res.json({ message: "Provider approved and badge activated.", request });
  } catch (err) {
    console.error("[verification] decide error:", err);
    return res.status(500).json({ message: "Could not process decision." });
  }
}

// POST /api/verification/requests/:id/pay-badge-fee  (provider)
// NOTE: this only marks the fee as paid — it does not itself process a
// charge. Wire this up behind the real Paystack/Flutterwave flow once that's
// built; for now it lets the approve-badge path be tested end-to-end.
async function markBadgeFeePaid(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Verification request not found." });
    if (String(request.provider) !== String(req.user._id)) {
      return res.status(403).json({ message: "This isn't your verification request." });
    }
    if (request.status !== "awaiting_payment") {
      return res.status(400).json({ message: "This request isn't awaiting payment." });
    }

    request.badgeFeePaid = true;
    request.status = "approved";
    await request.save();

    await User.findByIdAndUpdate(request.provider, {
      isVerifiedBadge: true,
      verifiedBadgeAt: new Date(),
    });

    await notify({
      userId: request.provider,
      type: "verification",
      title: "You're now a Verified Provider!",
      message: "Your Verified badge is live on your profile and services.",
      link: "/provider/settings",
    });

    return res.json({ message: "Badge fee recorded and badge activated.", request });
  } catch (err) {
    console.error("[verification] markBadgeFeePaid error:", err);
    return res.status(500).json({ message: "Could not record payment." });
  }
}

module.exports = {
  createRequest,
  getMyRequest,
  listRequests,
  scheduleCall,
  completeCall,
  decide,
  markBadgeFeePaid,
};
