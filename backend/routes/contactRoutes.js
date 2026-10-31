const express = require("express");
const rateLimit = require("express-rate-limit");
const { createTicket, trackTicket, customerReply } = require("../controllers/contactController");

const router = express.Router();
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many requests. Please try again in a few minutes." },
  });

// Public endpoints, so each one is rate limited (they send emails and write to the database).
router.post("/", limiter(5), createTicket);
router.post("/track", limiter(20), trackTicket);
router.post("/reply", limiter(10), customerReply);

module.exports = router;
