const Post = require("../models/Post");
const { notify } = require("../utils/notify");

// POST /api/posts  (any authenticated user)
async function createPost(req, res) {
  try {
    const { title, content, coverImage } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Title and content are required." });

    const isAdminAuthor = !!req.user.isAdmin;
    const post = await Post.create({
      author: req.user._id,
      title,
      content,
      coverImage: coverImage || "",
      status: isAdminAuthor ? "approved" : "pending",
    });
    return res.status(201).json({
      message: isAdminAuthor ? "Post published." : "Post submitted for review.",
      post,
    });
  } catch (err) {
    console.error("[posts] createPost error:", err);
    return res.status(500).json({ message: "Could not create post." });
  }
}

// GET /api/posts  (public) — only approved posts, newest first
async function listPosts(req, res) {
  try {
    const posts = await Post.find({ status: "approved" })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ posts });
  } catch (err) {
    console.error("[posts] listPosts error:", err);
    return res.status(500).json({ message: "Could not fetch posts." });
  }
}

// GET /api/posts/mine  (author — see their own posts regardless of status)
async function getMyPosts(req, res) {
  try {
    const posts = await Post.find({ author: req.user._id }).sort({ createdAt: -1 });
    return res.json({ posts });
  } catch (err) {
    console.error("[posts] getMyPosts error:", err);
    return res.status(500).json({ message: "Could not fetch your posts." });
  }
}

// GET /api/posts/:id  (public — approved only, unless you're the author or an admin)
async function getPost(req, res) {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name avatar")
      .populate("comments.author", "name avatar");
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (post.status !== "approved") {
      const isOwner = req.user && String(post.author._id) === String(req.user._id);
      const isAdmin = req.user && req.user.isAdmin;
      if (!isOwner && !isAdmin) return res.status(404).json({ message: "Post not found." });
    }
    return res.json({ post });
  } catch (err) {
    console.error("[posts] getPost error:", err);
    return res.status(500).json({ message: "Could not fetch post." });
  }
}

// POST /api/posts/:id/like  (authenticated — guests are blocked by `protect` upstream)
async function toggleLike(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const alreadyLiked = post.likes.some((id) => String(id) === String(req.user._id));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(req.user._id));
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    return res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (err) {
    console.error("[posts] toggleLike error:", err);
    return res.status(500).json({ message: "Could not update like." });
  }
}

// POST /api/posts/:id/comments  (authenticated)
async function addComment(req, res) {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: "Comment can't be empty." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    post.comments.push({ author: req.user._id, content: content.trim() });
    await post.save();

    if (String(post.author) !== String(req.user._id)) {
      await notify({
        userId: post.author,
        type: "blog",
        title: "New comment on your post",
        message: content.trim().slice(0, 80),
        link: `/blog/${post._id}`,
      });
    }

    const updated = await Post.findById(post._id).populate("comments.author", "name avatar");
    return res.status(201).json({ message: "Comment added.", comments: updated.comments });
  } catch (err) {
    console.error("[posts] addComment error:", err);
    return res.status(500).json({ message: "Could not add comment." });
  }
}

// --- Admin moderation ---

// GET /api/posts/admin/all  (admin) — optional ?status=
async function listAllPosts(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const posts = await Post.find(filter).populate("author", "name avatar email").sort({ createdAt: -1 });
    return res.json({ posts });
  } catch (err) {
    console.error("[posts] listAllPosts error:", err);
    return res.status(500).json({ message: "Could not fetch posts." });
  }
}

// PATCH /api/posts/:id/moderate  (admin)  body: { decision: "approve"|"reject" }
async function moderatePost(req, res) {
  try {
    const { decision } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "decision must be 'approve' or 'reject'." });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    post.status = decision === "approve" ? "approved" : "rejected";
    await post.save();

    await notify({
      userId: post.author,
      type: "blog",
      title: decision === "approve" ? "Your post was published" : "Your post wasn't approved",
      message: post.title,
      link: decision === "approve" ? `/blog/${post._id}` : "/dashboard/posts",
    });

    return res.json({ message: `Post ${decision}d.`, post });
  } catch (err) {
    console.error("[posts] moderatePost error:", err);
    return res.status(500).json({ message: "Could not moderate post." });
  }
}

// DELETE /api/posts/:id  (admin, or the author)
async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (String(post.author) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }
    await post.deleteOne();
    return res.json({ message: "Post deleted." });
  } catch (err) {
    console.error("[posts] deletePost error:", err);
    return res.status(500).json({ message: "Could not delete post." });
  }
}

module.exports = {
  createPost,
  listPosts,
  getMyPosts,
  getPost,
  toggleLike,
  addComment,
  listAllPosts,
  moderatePost,
  deletePost,
};
