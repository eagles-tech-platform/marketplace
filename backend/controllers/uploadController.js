const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { isS3 } = require("../config/uploadConfig");
const { uploadToS3 } = require("../services/s3");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function extensionFor(mimetype) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return map[mimetype] || "";
}

// POST /api/uploads  (any authenticated user, multipart/form-data field "file")
async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const key = `${req.user._id}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extensionFor(req.file.mimetype)}`;

    if (isS3()) {
      const url = await uploadToS3({ buffer: req.file.buffer, key, contentType: req.file.mimetype });
      return res.status(201).json({ url });
    }

    // Local mode — write to backend/uploads and serve statically (see server.js)
    ensureUploadsDir();
    const filePath = path.join(UPLOADS_DIR, key.replace(/\//g, "_"));
    fs.writeFileSync(filePath, req.file.buffer);
    const publicPath = `/uploads/${path.basename(filePath)}`;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return res.status(201).json({ url: `${baseUrl}${publicPath}` });
  } catch (err) {
    console.error("[uploads] uploadFile error:", err);
    return res.status(500).json({ message: err.message || "Could not upload file." });
  }
}

module.exports = { uploadFile };
