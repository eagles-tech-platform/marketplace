const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createRequest, getMyRequests, getRequest } = require("../controllers/recommendationController");

const router = express.Router();

router.post("/", protect, createRequest);
router.get("/mine", protect, getMyRequests);
router.get("/:id", protect, getRequest);

module.exports = router;
