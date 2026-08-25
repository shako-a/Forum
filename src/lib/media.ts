import "server-only";
import { db } from "@/lib/db";
import { deleteFromSpaces } from "@/lib/storage";

// Upload quotas — per user, rolling 24 hours. The per-file caps live in the
// upload route; these bound how much one account can push in a day. Pro gets
// more headroom (listing galleries, business media) without being unlimited.
export type UploadTier = "standard" | "pro" | "admin";

export const UPLOAD_QUOTA: Record<UploadTier, { files: number; bytes: number }> = {
  standard: { files: 30, bytes: 150 * 1024 * 1024 },
  pro: { files: 100, bytes: 600 * 1024 * 1024 },
  admin: { files: 1_000, bytes: 5 * 1024 * 1024 * 1024 },
};

export function uploadTierFor(u: { role: string; isPro: boolean; featureKeys?: string[] }): UploadTier {
  if (u.role === "ADMIN") return "admin";
  if (u.isPro || u.featureKeys?.includes("business") || u.featureKeys?.includes("realEstate")) return "pro";
  return "standard";
}

// What the user has uploaded in the last 24h, against their tier's ceiling.
export async function uploadUsage(userId: string, tier: UploadTier) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const agg = await db.mediaUpload.aggregate({
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { size: true },
  });
  const files = agg._count._all;
  const bytes = agg._sum.size ?? 0;
  const quota = UPLOAD_QUOTA[tier];
  return { files, bytes, quota, filesLeft: quota.files - files, bytesLeft: quota.bytes - bytes };
}

export async function recordUpload(args: {
  userId: string;
  key: string;
  url: string;
  contentType: string;
  size: number;
}): Promise<void> {
  await db.mediaUpload.create({ data: args });
}

// Release uploads by public URL: only URLs that came through /api/upload have a
// ledger row, so external/legacy URLs are left alone. Best-effort — a storage
// hiccup must never block the content deletion that triggered this.
export async function deleteUploadsByUrl(urls: Array<string | null | undefined>): Promise<void> {
  const wanted = [...new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))];
  if (wanted.length === 0) return;
  try {
    const rows = await db.mediaUpload.findMany({
      where: { url: { in: wanted } },
      select: { id: true, key: true },
    });
    if (rows.length === 0) return;
    await deleteFromSpaces(rows.map((r) => r.key));
    await db.mediaUpload.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  } catch (err) {
    console.error("Media cleanup failed:", err instanceof Error ? err.message : err);
  }
}

// Same, by ledger id (admin tooling).
export async function deleteUploadById(id: string): Promise<boolean> {
  const row = await db.mediaUpload.findUnique({ where: { id }, select: { key: true } });
  if (!row) return false;
  try {
    await deleteFromSpaces([row.key]);
  } catch (err) {
    console.error("Media delete failed:", err instanceof Error ? err.message : err);
    return false;
  }
  await db.mediaUpload.delete({ where: { id } });
  return true;
}
