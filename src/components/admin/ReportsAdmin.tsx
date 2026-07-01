"use client";

import { useTransition } from "react";
import { resolveReport } from "@/app/actions/inbox";
import type { Dictionary } from "@/i18n/dictionaries";

export type AdminReport = {
  id: string;
  reporter: string;
  reported: string | null;
  reason: string | null;
  context: string | null;
  target: { href: string; label: string } | null;
  status: string;
  createdAt: string;
};

function Row({ r, dict }: { r: AdminReport; dict: Dictionary }) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const resolved = r.status === "RESOLVED";
  return (
    <tr className={resolved ? "opacity-50" : ""}>
      <td>{r.reporter}</td>
      <td>{r.reported ?? "—"}</td>
      <td>
        {r.target ? (
          <a className="admin-link" href={r.target.href} target="_blank" rel="noreferrer">
            {r.target.label}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td style={{ color: "var(--muted)" }}>
        {r.reason || "—"}
        {r.context && <div className="report-context">“{r.context}”</div>}
      </td>
      <td>{resolved ? t.resolved : t.open}</td>
      <td style={{ textAlign: "right" }}>
        {!resolved && (
          <button
            type="button"
            className="action"
            disabled={pending}
            onClick={() => startTransition(() => void resolveReport(r.id))}
          >
            {t.resolve}
          </button>
        )}
      </td>
    </tr>
  );
}

export function ReportsAdmin({ dict, reports }: { dict: Dictionary; reports: AdminReport[] }) {
  const t = dict.admin;
  return (
    <div>
      <h1 className="admin-h1">{t.reports}</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.reporter}</th>
            <th>{t.reported}</th>
            <th>{t.reportContent}</th>
            <th>{t.reason}</th>
            <th>{t.status}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <Row key={r.id} r={r} dict={dict} />
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {t.noReports}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
