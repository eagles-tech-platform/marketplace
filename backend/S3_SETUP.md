# Setting up AWS S3 for file uploads

The S3 upload code (`backend/services/s3.js`) is already built and correct —
this doc is the one-time AWS console setup it depends on. Do this once,
then flip `UPLOAD_MODE=local` → `UPLOAD_MODE=s3` in `backend/.env` and
everything (services, verification photos, blog covers, chat attachments,
avatars) switches to real S3 storage with no code changes.

## 1. Create the bucket

- AWS Console → S3 → Create bucket
- Pick a globally-unique name (e.g. `marketplace-uploads-yourname`) and a
  region close to your users (e.g. `eu-west-1` for wider Africa coverage,
  or check what's fastest from Nigeria specifically — `eu-west-1` or
  `eu-central-1` are typically better than US regions).
- **Note the exact bucket name and region** — you'll need both for `.env`.

## 2. Allow public read access

Uploaded images need to be viewable in `<img>` tags across the site, so
the bucket needs a policy allowing public read. By default AWS blocks
this, so:

- On the bucket → **Permissions** tab → **Block public access** → Edit →
  uncheck the two boxes about "...through new/any public bucket or access
  point **policies**" (leave the ACL-related ones checked — not needed) →
  Save → confirm.
- Same tab → **Bucket policy** → paste this, replacing
  `YOUR-BUCKET-NAME`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

This only allows reading files (viewing images) publicly — not listing
the bucket or uploading. Uploads still require your secret key, which
only your backend has.

## 3. Create an IAM user for the backend to upload with

Don't use your AWS root account credentials in `.env`. Create a scoped
IAM user instead:

- AWS Console → IAM → Users → Create user → e.g. `marketplace-backend`
- Attach a policy (JSON, "Create policy" → paste, replacing the bucket
  name) granting only what the backend needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

- After creating the user, go to **Security credentials** → **Create
  access key** → choose "Application running outside AWS" → copy the
  **Access key ID** and **Secret access key** (the secret is shown once).

## 4. Fill in `backend/.env`

```
UPLOAD_MODE=s3
AWS_ACCESS_KEY_ID=<the access key from step 3>
AWS_SECRET_ACCESS_KEY=<the secret key from step 3>
AWS_REGION=<the region from step 1, e.g. eu-west-1>
AWS_BUCKET_NAME=<the bucket name from step 1>
```

## 5. Restart and test

Restart the backend, then upload a service photo or portfolio image
anywhere in the app. Open the URL that comes back directly in a browser
tab — you should see the image. If you get an "Access Denied" XML page
instead, the most common cause is the Block Public Access checkboxes in
step 2 not being unchecked, or the bucket policy resource ARN not
matching your exact bucket name.

## Rolling back

If anything goes wrong, set `UPLOAD_MODE=local` again — no other change
needed, uploads immediately go back to local disk storage.
