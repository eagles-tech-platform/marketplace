const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createBooking, getMyBookings, updateBookingStatus } = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/mine", protect, getMyBookings);
router.patch("/:id/status", protect, updateBookingStatus);

module.exports = router;
