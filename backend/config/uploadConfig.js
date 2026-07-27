// "local" (default) — files save to backend/uploads/ and are served
//   statically from this server. Works today, no AWS account needed.
// "s3" — files upload to a real S3 bucket. Flip this once you have an
//   AWS account + bucket set up; the upload code for it is already built.
const UPLOAD_MODE = (process.env.UPLOAD_MODE || "local").toLowerCase();

const isS3 = () => UPLOAD_MODE === "s3";

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 5);

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Chat attachments allow a couple of common document types too, not just images.
const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

module.exports = { UPLOAD_MODE, isS3, MAX_FILE_SIZE_MB, ALLOWED_IMAGE_TYPES, ALLOWED_ATTACHMENT_TYPES };
