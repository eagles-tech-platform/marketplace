const multer = require("multer");
const { MAX_FILE_SIZE_MB, ALLOWED_ATTACHMENT_TYPES } = require("../config/uploadConfig");

// Memory storage (not diskStorage) so the same uploaded buffer can be
// written to local disk OR sent to S3 from the controller depending on
// UPLOAD_MODE, without duplicating the multer setup for each.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} isn't allowed.`));
    }
    cb(null, true);
  },
});

module.exports = upload;
