const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  createService,
  getMyServices,
  updateService,
  deleteService,
  listServices,
  getService,
} = require("../controllers/serviceController");

const router = express.Router();

router.get("/", listServices);
router.get("/mine", protect, requireRole("provider"), getMyServices);
router.get("/:id", getService);
router.post("/", protect, requireRole("provider"), createService);
router.patch("/:id", protect, requireRole("provider", "admin"), updateService);
router.delete("/:id", protect, requireRole("provider", "admin"), deleteService);

module.exports = router;
