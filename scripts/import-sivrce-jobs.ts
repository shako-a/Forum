// One-off: turn the sivrce.us jobs export into a data migration.
//
//   npx tsx scripts/import-sivrce-jobs.ts
//
// Reads scripts/data/sivrce-jobs.json (the mapped export: category keys,
// city/state, "$"-normalised pay, contact pulled from the text where the sheet
// had none) and writes prisma/migrations/<ts>_import_sivrce_jobs/migration.sql,
// following the GeoQartuli business import. The export's images were three
// repeated advertising banners, not listing photos, so nothing is re-hosted.
//
// Rows are member postings owned by the site owner (resolved in SQL, so the
// file carries no environment-specific ids). Ids are derived from the source
// ids, so re-running is idempotent (ON CONFLICT DO NOTHING) and the migration
// is a no-op where no owner exists — the empty shadow database `prisma
// migrate dev` checks against.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { textToPmDoc, pmPlainText } from "../src/lib/prosemirror";

type Row = {
  src: string; no: number; title: string; description: string; category: string | null; pay: string | null;
  contactPhone: string | null; contactEmail: string | null; city: string | null; state: string | null;
};

const q = (s: string | null | undefined) => (s == null || s === "" ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const id = (src: string) => "c" + createHash("sha256").update("sivrce:" + src).digest("hex").slice(0, 24);

const rows: Row[] = JSON.parse(readFileSync("scripts/data/sivrce-jobs.json", "utf8"));
// The export is newest-first; two hours apart keeps that order on the board
// and spreads the batch over the past couple of months rather than one day.
const newest = Date.parse("2026-09-10T18:00:00Z");
const stmts = rows.map((r) => {
  const doc = textToPmDoc(r.description);
  const at = new Date(newest - (r.no - 1) * 2 * 3600_000).toISOString();
  return `INSERT INTO "JobPosting" ("id","businessId","posterId","title","description","descriptionRich","companyName","jobType","category","pay","contactEmail","contactPhone","city","state","active","featured","featuredOrder","discussionId","createdAt","updatedAt")
SELECT ${q(id(r.src))}, NULL, o.id, ${q(r.title)}, ${q(pmPlainText(doc))}, ${q(JSON.stringify(doc))}::jsonb, NULL, NULL, ${q(r.category)}, ${q(r.pay)}, ${q(r.contactEmail)}, ${q(r.contactPhone)}, ${q(r.city)}, ${q(r.state)}, true, false, 0, NULL, ${q(at)}::timestamp, ${q(at)}::timestamp
FROM owner o WHERE o.id IS NOT NULL ON CONFLICT ("id") DO NOTHING;`;
});

const owner = `WITH owner AS (SELECT coalesce((SELECT "id" FROM "User" WHERE "isOwner" = true ORDER BY "createdAt" LIMIT 1), (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1)) AS id)`;
const sql = [
  `-- Data migration: the sivrce.us jobs export (${rows.length} member postings,`,
  "-- attributed to the site owner). Idempotent: ids derive from the source ids.",
  ...stmts.map((s) => owner + "\n" + s),
].join("\n\n") + "\n";
const dir = "prisma/migrations/20260911130000_import_sivrce_jobs";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/migration.sql`, sql);
console.log(`wrote ${dir}/migration.sql — ${stmts.length} jobs`);
