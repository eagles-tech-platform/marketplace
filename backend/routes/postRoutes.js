const express = require("express");
const { protect, requireRole, optionalAuth } = require("../middleware/authMiddleware");
const {
  createPost,
  listPosts,
  getMyPosts,
  getPost,
  toggleLike,
  addComment,
  listAllPosts,
  moderatePost,
  deletePost,
} = require("../controllers/postController");

const router = express.Router();

router.get("/", listPosts);
router.get("/mine", protect, getMyPosts);
router.get("/admin/all", protect, requireRole("admin"), listAllPosts);
router.get("/:id", optionalAuth, getPost);
router.post("/", protect, createPost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comments", protect, addComment);
router.patch("/:id/moderate", protect, requireRole("admin"), moderatePost);
router.delete("/:id", protect, deletePost);

module.exports = router;
