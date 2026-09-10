// One-off: turn the GeoQartuli directory export into a data migration.
//
//   set -a; source .env; set +a; npx tsx scripts/import-geoqartuli.ts
//
// Reads scripts/data/geoqartuli-businesses.json (the mapped export), re-hosts
// every image in our own Spaces bucket so the listings don't depend on the
// other site's storage, and writes prisma/migrations/<ts>_import_geoqartuli_
// businesses/migration.sql. Shipping the rows as a migration means the deploy
// job applies them to production atomically — the same way visitor_baseline
// seeded its row — and the exact SQL is exercised locally first.
//
// Owner is resolved in SQL (the site owner, else the oldest admin), so the
// file carries no environment-specific ids. Idempotent: ON CONFLICT DO NOTHING,
// and a no-op where no owner exists — which is what lets it replay in the
// empty shadow database `prisma migrate dev` checks migrations against.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { slugify } from "../src/lib/slug";
import { textToPmDoc, pmPlainText } from "../src/lib/prosemirror";
import { ZIP_DATA, ZIP_STATES, ZIP_RECORD_LEN, ZIP_COUNT } from "../src/lib/zip-data";

type Row = {
  src: string; name: string; category: string; featured: boolean; tagline: string; description: string;
  phone: string; whatsapp: string; email: string; website: string; bookingUrl: string;
  socialFacebook: string; socialInstagram: string; socialTiktok: string;
  address: string; city: string; state: string; zip: string; lat: number | null; lng: number | null;
  languages: string[]; paymentMethods: string[]; details: { label: string; value: string }[];
  photos: string[]; views: number; createdAt: string; updatedAt: string;
};

// lib/geo.ts is server-only; the lookup is a binary search over the packed table.
function lookupZip(zip: string): { lat: number; lng: number } | null {
  const m = zip.trim().match(/^(\d{5})/);
  if (!m) return null;
  let lo = 0, hi = ZIP_COUNT - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const at = mid * ZIP_RECORD_LEN;
    const key = ZIP_DATA.slice(at, at + 5);
    if (key === m[1]) return { lat: Number(ZIP_DATA.slice(at + 5, at + 10)) / 1000, lng: (Number(ZIP_DATA.slice(at + 10, at + 16)) - 180000) / 1000 };
    if (key < m[1]) lo = mid + 1; else hi = mid - 1;
  }
  void ZIP_STATES;
  return null;
}

const cuid = () => "c" + randomBytes(12).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24).padEnd(24, "0");
const q = (s: string | null | undefined) => (s == null || s === "" ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => (xs.length ? `ARRAY[${xs.map((x) => q(x)).join(",")}]::text[]` : "ARRAY[]::text[]");
const num = (n: number | null) => (n == null ? "NULL" : String(n));

const KEY = process.env.SPACES_KEY!, SECRET = process.env.SPACES_SECRET!, BUCKET = process.env.SPACES_BUCKET!, REGION = process.env.SPACES_REGION!;
if (!KEY || !SECRET || !BUCKET || !REGION) throw new Error("Spaces env missing — source .env first");
const s3 = new S3Client({ region: REGION, endpoint: `https://${REGION}.digitaloceanspaces.com`, credentials: { accessKeyId: KEY, secretAccessKey: SECRET } });

async function rehost(url: string): Promise<{ key: string; url: string; contentType: string; size: number } | null> {
  const res = await fetch(url);
  if (!res.ok) { console.warn("  skip (HTTP " + res.status + ")", url); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type")?.split(";")[0] || "image/webp";
  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif" }[contentType] ?? "webp";
  const key = `uploads/${Date.now()}-${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType, ACL: "public-read" }));
  return { key, url: `https://${BUCKET}.${REGION}.digitaloceanspaces.com/${key}`, contentType, size: buf.length };
}

async function main() {
  const rows: Row[] = JSON.parse(readFileSync("scripts/data/geoqartuli-businesses.json", "utf8"));
  const used = new Set<string>();
  const stmts: string[] = [];
  const media: string[] = [];
  let featuredOrder = 100; // after whatever is already curated on the live site

  for (const r of rows) {
    const base = slugify(r.name) || `business-${r.src}`;
    let slug = base, n = 1;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);

    const photos: string[] = [];
    for (const src of r.photos) {
      const up = await rehost(src);
      if (!up) continue;
      photos.push(up.url);
      media.push(`INSERT INTO "MediaUpload" ("id","userId","key","url","contentType","size","createdAt") SELECT ${q(cuid())}, o.id, ${q(up.key)}, ${q(up.url)}, ${q(up.contentType)}, ${up.size}, now() FROM owner o WHERE o.id IS NOT NULL ON CONFLICT ("url") DO NOTHING;`);
    }
    console.log(`${r.name}: ${photos.length}/${r.photos.length} photos`);

    const doc = textToPmDoc(r.description);
    const point = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : r.zip ? lookupZip(r.zip) : null;
    const featured = r.featured ? ++featuredOrder : 0;
    stmts.push(`INSERT INTO "Business" ("id","slug","ownerId","name","tagline","description","descriptionRich","category","logoUrl","photos","address","city","zip","state","lat","lng","website","email","phone","whatsapp","bookingUrl","socialFacebook","socialInstagram","socialTiktok","socialYoutube","socialTelegram","languages","paymentMethods","details","verified","featured","featuredOrder","views","ratingCount","ratingSum","createdAt","updatedAt")
SELECT ${q(cuid())}, ${q(slug)}, o.id, ${q(r.name)}, ${q(r.tagline)}, ${q(pmPlainText(doc))}, ${q(JSON.stringify(doc))}::jsonb, ${q(r.category)}, NULL, ${arr(photos)}, ${q(r.address)}, ${q(r.city)}, ${q(r.zip)}, ${q(r.state)}, ${num(point?.lat ?? null)}, ${num(point?.lng ?? null)}, ${q(r.website)}, ${q(r.email)}, ${q(r.phone)}, ${q(r.whatsapp)}, ${q(r.bookingUrl)}, ${q(r.socialFacebook)}, ${q(r.socialInstagram)}, ${q(r.socialTiktok)}, NULL, NULL, ${arr(r.languages)}, ${arr(r.paymentMethods)}, ${q(JSON.stringify(r.details))}::jsonb, false, ${r.featured}, ${featured}, ${r.views}, 0, 0, ${q(r.createdAt)}::timestamp, ${q(r.updatedAt)}::timestamp
FROM owner o WHERE o.id IS NOT NULL ON CONFLICT ("slug") DO NOTHING;`);
  }

  const owner = `WITH owner AS (SELECT coalesce((SELECT "id" FROM "User" WHERE "isOwner" = true ORDER BY "createdAt" LIMIT 1), (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1)) AS id)`;
  const sql = [
    "-- Data migration: the GeoQartuli directory export (28 businesses, images",
    "-- re-hosted in our Spaces bucket). Rows are attributed to the site owner.",
    "-- Idempotent: a slug or upload URL that already exists is left alone.",
    ...stmts.map((s) => owner + "\n" + s),
    ...media.map((s) => owner + "\n" + s),
  ].join("\n\n") + "\n";
  const dir = "prisma/migrations/20260911120000_import_geoqartuli_businesses";
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/migration.sql`, sql);
  console.log(`wrote ${dir}/migration.sql — ${stmts.length} businesses, ${media.length} media rows`);
}
main().catch((e) => { console.error(e); process.exit(1); });
