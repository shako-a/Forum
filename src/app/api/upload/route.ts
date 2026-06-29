import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { isSpacesConfigured, uploadToSpaces } from "@/lib/storage";

// Allowed MIME types → file extension.
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
const MAX_VIDEO = 80 * 1024 * 1024; // 80 MB

// Diagnostic: is Spaces configured? Boolean only (no secrets). Used to verify
// the env vars are live in an environment.
export async function GET() {
  return NextResponse.json({ configured: isSpacesConfigured() });
}

// Server-side upload: browser → here → Spaces (no CORS). Logged-in users only.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSpacesConfigured()) {
    return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });

  const isVideo = file.type.startsWith("video/");
  if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToSpaces(buffer, file.type, ext);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
