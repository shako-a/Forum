import "server-only";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

export function spacesPublicUrl(key: string): string {
  return `https://${BUCKET}.${REGION}.digitaloceanspaces.com/${key}`;
}

// Upload bytes; returns the object key and its public CDN-style URL.
export async function uploadToSpaces(
  body: Buffer,
  contentType: string,
  ext: string,
): Promise<{ key: string; url: string }> {
  const key = `uploads/${Date.now()}-${randomUUID()}.${ext}`;
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
  return { key, url: spacesPublicUrl(key) };
}

// Remove objects from the bucket (batched; S3 caps a single call at 1000).
export async function deleteFromSpaces(keys: string[]): Promise<void> {
  if (!isSpacesConfigured() || keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 1000) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: BUCKET!,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}
