"use client";

import Link from "next/link";
import { useTransition } from "react";
import { resolveReport, dismissReport } from "@/app/actions/inbox";
import { adminRemoveMarketListing, adminRestoreMarketListing } from "@/app/actions/admin-market";
import { setEstateActive } from "@/app/actions/admin-estate";
import { MARKET_REPORT_REASONS } from "@/lib/market";
import { ESTATE_REPORT_REASONS } from "@/lib/estate";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminReportListing = {
  id: string;
  slug: string;
  title: string;
  priceLabel: string;
  status: string;
  thumb: string | null;
  sellerId: string | null;
  sellerName: string | null;
  openReportsOnListing: number;
  reportsAboutSeller: number;
};

export type AdminReportEstate = {
  id: string;
  slug: string;
  title: string;
  priceLabel: string;
  active: boolean;
  thumb: string | null;
};

export type AdminReport = {
  id: string;
  type: "post" | "reply" | "dm" | "market" | "estate" | "other";
  reporter: string;
  reported: string | null;
  reportedId: string | null;
  reason: string | null;
  context: string | null;
  target: { href: string; label: string } | null;
  listing: AdminReportListing | null;
  estate: AdminReportEstate | null;
  status: string;
  note: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type ReportFilters = { status: string; type: string };

// "scam — details" → localized reason label + the free-text details.
function reasonText(reason: string | null, locale: Locale): string {
  if (!reason) return "—";
  const [key, ...rest] = reason.split(" — ");
  const def = MARKET_REPORT_REASONS.find((r) => r.key === key) ?? ESTATE_REPORT_REASONS.find((r) => r.key === key);
  if (!def) return reason;
  const label = `${def.icon} ${locale === "ka" ? def.ka : def.en}`;
  return rest.length ? `${label} — ${rest.join(" — ")}` : label;
}

function Row({ r, dict, locale }: { r: AdminReport; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const open = r.status === "OPEN";
  const l = r.listing;
  const e = r.estate;

  const act = (fn: () => Promise<void>) => startTransition(() => void fn());
  const closeWithNote = (fn: (id: string, note?: string) => Promise<void>) => {
    const note = window.prompt(t.resolveNotePrompt, "");
    if (note === null) return;
    act(() => fn(r.id, note));
  };

  return (
    <tr className={open ? "" : "opacity-50"}>
      <td>
        <div>{new Date(r.createdAt).toLocaleDateString()}</div>
        <div className="muted-sm">{r.reporter}</div>
      </td>
      <td>
        {r.reported ? (
          r.reportedId ? (
            <Link href={`/${locale}/admin/users/${r.reportedId}`} className="admin-link">{r.reported}</Link>
          ) : (
            r.reported
          )
        ) : (
          "—"
        )}
        {l && l.reportsAboutSeller > 1 && (
          <div className="muted-sm">{t.sellerReports.replace("{n}", String(l.reportsAboutSeller))}</div>
        )}
      </td>
      <td>
        {l ? (
          <div className="report-listing">
            <a href={`/${locale}/market/${l.slug}`} target="_blank" rel="noreferrer" className="report-listing-thumb">
              {l.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.thumb} alt="" />
              ) : (
                <span>🛍️</span>
              )}
            </a>
            <div className="report-listing-info">
              <a href={`/${locale}/market/${l.slug}`} target="_blank" rel="noreferrer" className="admin-link">
                {l.title}
              </a>
              <div className="muted-sm">
                {l.priceLabel} · {l.status === "REMOVED" ? <strong className="report-removed">{t.listingRemoved}</strong> : l.status}
                {l.openReportsOnListing > 1 && <> · {t.listingReports.replace("{n}", String(l.openReportsOnListing))}</>}
              </div>
            </div>
          </div>
        ) : e ? (
          <div className="report-listing">
            <a href={`/${locale}/realestate/${e.slug}`} target="_blank" rel="noreferrer" className="report-listing-thumb">
              {e.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.thumb} alt="" />
              ) : (
                <span>🏠</span>
              )}
            </a>
            <div className="report-listing-info">
              <a href={`/${locale}/realestate/${e.slug}`} target="_blank" rel="noreferrer" className="admin-link">{e.title}</a>
              <div className="muted-sm">{e.priceLabel} · {e.active ? "ACTIVE" : <strong className="report-removed">{t.unlisted}</strong>}</div>
            </div>
          </div>
        ) : r.target ? (
          <a className="admin-link" href={r.target.href} target="_blank" rel="noreferrer">
            {r.target.label}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td style={{ color: "var(--muted)" }}>
        {reasonText(r.reason, locale)}
        {r.context && <div className="report-context">“{r.context}”</div>}
        {r.note && (
          <div className="report-note">
            📝 {r.note}
          </div>
        )}
      </td>
      <td>
        {r.status === "OPEN" ? t.open : r.status === "DISMISSED" ? t.dismissed : t.resolved}
        {r.resolvedBy && (
          <div className="muted-sm">
            {t.closedBy.replace("{name}", r.resolvedBy)}
            {r.resolvedAt && <> · {new Date(r.resolvedAt).toLocaleDateString()}</>}
          </div>
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        <div className="report-actions">
          {l && l.status !== "REMOVED" && (
            <button
              type="button"
              className="action mod-action"
              disabled={pending}
              onClick={() => {
                const reason = window.prompt(t.removeReasonPrompt, "");
                if (reason === null) return;
                act(() => adminRemoveMarketListing(l.id, reason));
              }}
            >
              🚫 {t.removeListing}
            </button>
          )}
          {l && l.status === "REMOVED" && (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => adminRestoreMarketListing(l.id))}>
              ↻ {t.restoreListing}
            </button>
          )}
          {e && e.active && (
            <button
              type="button"
              className="action mod-action"
              disabled={pending}
              onClick={() => {
                const reason = window.prompt(t.unlistReasonPrompt, "");
                if (reason === null) return;
                act(() => setEstateActive(e.id, false, reason));
              }}
            >
              🚫 {t.unlist}
            </button>
          )}
          {e && !e.active && (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => setEstateActive(e.id, true))}>
              ↻ {t.relist}
            </button>
          )}
          {open && (
            <>
              <button type="button" className="action" disabled={pending} onClick={() => closeWithNote(resolveReport)}>
                ✓ {t.resolve}
              </button>
              <button type="button" className="action" disabled={pending} onClick={() => closeWithNote(dismissReport)}>
                {t.dismiss}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ReportsAdmin({
  dict,
  locale,
  reports,
  filters,
  openCount,
}: {
  dict: Dictionary;
  locale: Locale;
  reports: AdminReport[];
  filters: ReportFilters;
  openCount: number;
}) {
  const t = dict.admin;
  const href = (patch: Partial<ReportFilters>) => {
    const f = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (f.status !== "open") q.set("status", f.status);
    if (f.type !== "all") q.set("type", f.type);
    const s = q.toString();
    return `/${locale}/admin/reports${s ? `?${s}` : ""}`;
  };
  const statusTabs: Array<[string, string]> = [
    ["open", `${t.filterOpen} (${openCount})`],
    ["resolved", t.filterResolved],
    ["dismissed", t.filterDismissed],
    ["all", t.filterAll],
  ];
  const typeTabs: Array<[string, string]> = [
    ["all", t.typeAll],
    ["market", t.typeMarket],
    ["estate", t.typeEstate],
    ["post", t.typePost],
    ["reply", t.typeReply],
    ["dm", t.typeDm],
  ];

  return (
    <div>
      <h1 className="admin-h1">{t.reports}</h1>
      <div className="admin-tabs">
        {statusTabs.map(([k, label]) => (
          <Link key={k} href={href({ status: k })} className={`admin-tab${filters.status === k ? " on" : ""}`}>
            {label}
          </Link>
        ))}
        <span className="admin-tabs-sep" />
        {typeTabs.map(([k, label]) => (
          <Link key={k} href={href({ type: k })} className={`admin-tab${filters.type === k ? " on" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
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
            <Row key={r.id} r={r} dict={dict} locale={locale} />
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
