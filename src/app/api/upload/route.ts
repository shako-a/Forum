import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { isSpacesConfigured, uploadToSpaces } from "@/lib/storage";
import { recordUpload, uploadTierFor, uploadUsage } from "@/lib/media";

// Accepted types → extension. The type is confirmed by sniffing the bytes, not
// by trusting the browser's Content-Type.
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 80 * 1024 * 1024; // 80 MB (admins only — ad cards)
// Multipart framing adds a little on top of the file itself.
const MAX_REQUEST = MAX_VIDEO + 64 * 1024;

// Magic-byte detection for everything in EXT. Returns null for anything else
// (SVG, HTML, executables relabelled as images, …).
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const gif = buf.subarray(0, 6).toString("ascii");
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  if (buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video/webm";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  return null;
}

// Server-side upload: browser → here → Spaces (no CORS). Logged-in users only;
// videos are admin-only; each upload is recorded against the user and counted
// toward a rolling 24h quota by tier.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSpacesConfigured()) {
    return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });
  }

  // Refuse oversized (or unsized) bodies BEFORE parsing — formData() would
  // otherwise buffer the whole request into memory first.
  const declared = Number(req.headers.get("content-length"));
  if (!Number.isFinite(declared) || declared <= 0) {
    return NextResponse.json({ error: "Missing content length." }, { status: 411 });
  }
  if (declared > MAX_REQUEST) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  const tier = uploadTierFor(user);
  const usage = await uploadUsage(user.id, tier);
  if (usage.filesLeft <= 0 || usage.bytesLeft <= 0) {
    return NextResponse.json({ error: "Daily upload limit reached. Try again tomorrow." }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniff(buffer);
  const ext = type ? EXT[type] : undefined;
  if (!type || !ext) return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });

  const isVideo = type.startsWith("video/");
  if (isVideo && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Video uploads are limited to administrators." }, { status: 403 });
  }
  if (buffer.length > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }
  if (buffer.length > usage.bytesLeft) {
    return NextResponse.json({ error: "Daily upload limit reached. Try again tomorrow." }, { status: 429 });
  }

  try {
    const { key, url } = await uploadToSpaces(buffer, type, ext);
    await recordUpload({ userId: user.id, key, url, contentType: type, size: buffer.length });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
