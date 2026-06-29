import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces (S3-compatible) object storage for uploaded media.
// Configured via env: SPACES_KEY, SPACES_SECRET, SPACES_BUCKET, SPACES_REGION.
const KEY = process.env.SPACES_KEY;
const SECRET = process.env.SPACES_SECRET;
const BUCKET = process.env.SPACES_BUCKET;
const REGION = process.env.SPACES_REGION; // e.g. "nyc3"

export function isSpacesConfigured(): boolean {
  return !!(KEY && SECRET && BUCKET && REGION);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: REGION!,
      endpoint: `https://${REGION}.digitaloceanspaces.com`,
      credentials: { accessKeyId: KEY!, secretAccessKey: SECRET! },
      forcePathStyle: false,
    });
  }
  return client;
}

// Upload bytes and return the public CDN-style URL.
export async function uploadToSpaces(
  body: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const rand = Math.random().toString(36).slice(2, 10);
  const key = `uploads/${Date.now()}-${rand}.${ext}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `https://${BUCKET}.${REGION}.digitaloceanspaces.com/${key}`;
}
