"use client";

import Link from "@/components/Link";
import { useTransition } from "react";
import { adminRemoveMarketListing, adminRestoreMarketListing, adminDeleteMarketListing } from "@/app/actions/admin-market";
import { MARKET_CATEGORIES, labelOf } from "@/lib/market";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminMarketListing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  priceLabel: string;
  status: string;
  thumb: string | null;
  views: number;
  favorites: number;
  openReports: number;
  sellerId: string;
  sellerName: string;
  createdAt: string;
};

function Row({ l, dict, locale }: { l: AdminMarketListing; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<void>) => start(() => void fn());
  return (
    <tr className={l.status === "REMOVED" ? "opacity-50" : ""}>
      <td>
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
            <a href={`/${locale}/market/${l.slug}`} target="_blank" rel="noreferrer" className="admin-link">{l.title}</a>
            <div className="muted-sm">{l.priceLabel} · {labelOf(MARKET_CATEGORIES, l.category, locale)}</div>
          </div>
        </div>
      </td>
      <td>
        <Link href={`/${locale}/admin/users/${l.sellerId}`} className="admin-link">{l.sellerName}</Link>
      </td>
      <td>
        <span className={`merch-status merch-status-${l.status.toLowerCase()}`}>{l.status}</span>
        {l.openReports > 0 && (
          <div className="report-removed">⚑ {t.listingReports.replace("{n}", String(l.openReports))}</div>
        )}
      </td>
      <td className="num">👁 {l.views} · ♥ {l.favorites}</td>
      <td>{new Date(l.createdAt).toLocaleDateString()}</td>
      <td style={{ textAlign: "right" }}>
        <div className="report-actions">
          {l.status !== "REMOVED" ? (
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
          ) : (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => adminRestoreMarketListing(l.id))}>
              ↻ {t.restoreListing}
            </button>
          )}
          <button
            type="button"
            className="action mod-action"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t.confirmDelete)) act(() => adminDeleteMarketListing(l.id));
            }}
          >
            🗑 {t.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function MarketAdmin({
  dict,
  locale,
  listings,
  q,
  status,
}: {
  dict: Dictionary;
  locale: Locale;
  listings: AdminMarketListing[];
  q: string;
  status: string;
}) {
  const t = dict.admin;
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">{t.marketListings}</h2>
      <form method="get" className="admin-filter-row">
        <input className="input" name="q" placeholder={t.searchListings} defaultValue={q} />
        <select className="input" name="status" defaultValue={status}>
          <option value="">{t.filterAll}</option>
          {["ACTIVE", "SOLD", "PAUSED", "REMOVED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost btn-sm">{dict.business.search}</button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.listing}</th>
            <th>{t.seller}</th>
            <th>{t.status}</th>
            <th>{t.engagement}</th>
            <th>{t.created}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => <Row key={l.id} l={l} dict={dict} locale={locale} />)}
          {listings.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>—</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
