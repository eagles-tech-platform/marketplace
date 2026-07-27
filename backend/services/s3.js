const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

function buildClient() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a buffer to S3 and returns its public URL. Assumes the bucket is
 * configured for public-read on the object (either bucket policy or ACL) —
 * that's a one-time setup step in AWS, not something this code can do for
 * you. See backend/S3_SETUP.md for step-by-step bucket setup + the exact policy to use.
 */
async function uploadToS3({ buffer, key, contentType }) {
  const client = buildClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

module.exports = { uploadToS3 };
