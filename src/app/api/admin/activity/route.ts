import { NextResponse } from "next/server";
import { authorize } from "@/lib/dal";
import { db } from "@/lib/db";
import { auditWhere, parseAuditFilters } from "@/lib/audit-query";

// Admin-only CSV export of the activity log, honouring the same filters as the
// page. Capped so an unfiltered export can't tie the instance up.
const MAX_ROWS = 10_000;

export async function GET(req: Request) {
  if (!(await authorize("ADMIN"))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const filters = parseAuditFilters(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await db.auditLog.findMany({ where: auditWhere(filters), orderBy: { at: "desc" }, take: MAX_ROWS });

  const esc = (v: unknown) => `"${(v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)).replace(/"/g, '""')}"`;
  const header = [
    "at_utc", "request_id", "actor_id", "actor_name", "actor_role", "acting_as_business_id",
    "action", "severity", "outcome", "model", "target_id", "target_label", "summary",
    "changes_json", "snapshot_json", "meta_json", "ip", "country", "user_agent", "path",
  ];
  const lines = rows.map((r) =>
    [
      r.at.toISOString(), r.requestId, r.actorId, r.actorName, r.actorRole, r.actingAsId,
      r.action, r.severity, r.outcome, r.model, r.targetId, r.targetLabel, r.summary,
      r.changes, r.snapshot, r.meta, r.ip, r.country, r.userAgent, r.path,
    ]
      .map(esc)
      .join(","),
  );
  // BOM so Excel opens the Georgian text as UTF-8.
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
