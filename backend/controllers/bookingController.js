const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const { notify } = require("../utils/notify");

// POST /api/bookings  (customer)
async function createBooking(req, res) {
  try {
    const { serviceId, type, notes } = req.body; // type: "one_time" | "ongoing"
    if (!serviceId || !type) {
      return res.status(400).json({ message: "serviceId and type are required." });
    }
    if (!["one_time", "ongoing"].includes(type)) {
      return res.status(400).json({ message: "type must be one_time or ongoing." });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Service not found or no longer available." });
    }
    if (String(service.provider) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't book your own service." });
    }

    const isTrialBooking = req.user.trialBookingsRemaining > 0;

    const booking = await Booking.create({
      customer: req.user._id,
      provider: service.provider,
      service: service._id,
      type,
      price: service.price,
      notes: notes || "",
      isTrialBooking,
    });

    if (isTrialBooking) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { trialBookingsRemaining: -1 } });
    }

    await notify({
      userId: service.provider,
      type: "booking",
      title: "New booking request",
      message: `${req.user.name} requested "${service.title}".`,
      link: "/provider/bookings",
    });

    return res.status(201).json({ message: "Booking created.", booking });
  } catch (err) {
    console.error("[bookings] createBooking error:", err);
    return res.status(500).json({ message: "Could not create booking." });
  }
}

// GET /api/bookings/mine  (customer or provider — depends on active role)
async function getMyBookings(req, res) {
  try {
    const roleField = req.user.activeRole === "provider" ? "provider" : "customer";
    const filter = { [roleField]: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const bookings = await Booking.find(filter)
      .populate("service", "title category niche price images")
      .populate("customer", "name avatar")
      .populate("provider", "name avatar isVerifiedBadge")
      .sort({ createdAt: -1 });

    return res.json({ bookings });
  } catch (err) {
    console.error("[bookings] getMyBookings error:", err);
    return res.status(500).json({ message: "Could not fetch bookings." });
  }
}

// PATCH /api/bookings/:id/status  (provider confirms/progresses/completes; customer cancels while pending)
async function updateBookingStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    const isProvider = String(booking.provider) === String(req.user._id);
    const isCustomer = String(booking.customer) === String(req.user._id);
    if (!isProvider && !isCustomer && !req.user.isAdmin) {
      return res.status(403).json({ message: "This isn't your booking." });
    }
    if (isCustomer && !isProvider && status !== "cancelled") {
      return res.status(403).json({ message: "Customers can only cancel a booking." });
    }
    if (status === "cancelled" && !["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "This booking can no longer be cancelled." });
    }

    booking.status = status;
    await booking.save();

    const notifyUserId = isProvider ? booking.customer : booking.provider;
    await notify({
      userId: notifyUserId,
      type: "booking",
      title: "Booking status updated",
      message: `Your booking is now "${status.replace("_", " ")}".`,
      link: isProvider ? "/dashboard/bookings" : "/provider/bookings",
    });

    return res.json({ message: "Booking updated.", booking });
  } catch (err) {
    console.error("[bookings] updateBookingStatus error:", err);
    return res.status(500).json({ message: "Could not update booking." });
  }
}

module.exports = { createBooking, getMyBookings, updateBookingStatus };
