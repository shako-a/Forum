"use client";

import Link from "@/components/Link";
import { useTransition } from "react";
import { setAutoFeatured, reorderAutoFeatured, adminRemoveAutoListing, adminRestoreAutoListing, adminDeleteAutoListing } from "@/app/actions/admin-auto";
import { formatPrice } from "@/lib/estate";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminAutoListing = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  price: number;
  mileage: number | null;
  location: string;
  thumb: string | null;
  status: string;
  featured: boolean;
  views: number;
  openReports: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
};

function Row({ l, dict, locale }: { l: AdminAutoListing; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<void>) => start(() => void fn());
  return (
    <tr className={l.status === "ACTIVE" ? "" : "opacity-50"}>
      <td>
        <div className="report-listing">
          <a href={`/${locale}/auto/${l.slug}`} target="_blank" rel="noreferrer" className="report-listing-thumb">
            {l.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.thumb} alt="" />
            ) : (
              <span>🚗</span>
            )}
          </a>
          <div className="report-listing-info">
            <a href={`/${locale}/auto/${l.slug}`} target="_blank" rel="noreferrer" className="admin-link">{l.featured && "★ "}{l.title}</a>
            <div className="muted-sm">
              {formatPrice(l.price)}{l.kind === "RENT" ? dict.auto.perDay : ""} · {l.kind === "RENT" ? dict.auto.forRent : dict.auto.forSale}
              {l.mileage != null && <> · {l.mileage.toLocaleString("en-US")} mi</>} · {l.location}
            </div>
          </div>
        </div>
      </td>
      <td><Link href={`/${locale}/admin/users/${l.ownerId}`} className="admin-link">{l.ownerName}</Link></td>
      <td>
        <span className={`merch-status merch-status-${l.status.toLowerCase()}`}>{l.status}</span>
        {l.openReports > 0 && <div className="report-removed">⚑ {t.listingReports.replace("{n}", String(l.openReports))}</div>}
      </td>
      <td className="num">👁 {l.views}</td>
      <td style={{ textAlign: "right" }}>
        <div className="report-actions">
          {l.status === "ACTIVE" && (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => setAutoFeatured(l.id, !l.featured))}>
              {l.featured ? `☆ ${t.unfeature}` : `★ ${t.feature}`}
            </button>
          )}
          {l.status !== "REMOVED" ? (
            <button
              type="button"
              className="action mod-action"
              disabled={pending}
              onClick={() => {
                const reason = window.prompt(t.removeReasonPrompt, "");
                if (reason === null) return;
                act(() => adminRemoveAutoListing(l.id, reason));
              }}
            >
              🚫 {t.removeListing}
            </button>
          ) : (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => adminRestoreAutoListing(l.id))}>↻ {t.restoreListing}</button>
          )}
          <button
            type="button"
            className="action mod-action"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t.confirmDelete)) act(() => adminDeleteAutoListing(l.id));
            }}
          >
            🗑 {t.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

function Banner({ featured, dict, locale }: { featured: AdminAutoListing[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const move = (i: number, dir: -1 | 1) => {
    const ids = featured.map((f) => f.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(() => void reorderAutoFeatured(ids));
  };
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">★ {t.autoBanner}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.autoBannerSub}</p>
      {featured.length === 0 ? (
        <p className="muted-sm">{t.estateBannerEmpty}</p>
      ) : (
        <ol className="admin-banner-list">
          {featured.map((f, i) => (
            <li key={f.id}>
              <span className="admin-banner-pos">{i + 1}</span>
              <a href={`/${locale}/auto/${f.slug}`} target="_blank" rel="noreferrer" className="admin-link">{f.title}</a>
              <span className="muted-sm">{formatPrice(f.price)}{f.kind === "RENT" ? dict.auto.perDay : ""} · {f.location}</span>
              <span className="admin-banner-tools">
                <button type="button" className="action" disabled={pending || i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="action" disabled={pending || i === featured.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="action mod-action" disabled={pending} onClick={() => start(() => void setAutoFeatured(f.id, false))}>✕</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AutoAdmin({
  dict,
  locale,
  listings,
  featured,
  q,
  kind,
  status,
}: {
  dict: Dictionary;
  locale: Locale;
  listings: AdminAutoListing[];
  featured: AdminAutoListing[];
  q: string;
  kind: string;
  status: string;
}) {
  const t = dict.admin;
  return (
    <>
      <Banner featured={featured} dict={dict} locale={locale} />
      <div className="admin-section">
        <h2 className="admin-section-title">{t.marketListings}</h2>
        <form method="get" className="admin-filter-row">
          <input className="input" name="q" placeholder={t.autoSearch} defaultValue={q} />
          <select className="input" name="kind" defaultValue={kind}>
            <option value="">{dict.auto.saleAndRent}</option>
            <option value="SALE">{dict.auto.forSale}</option>
            <option value="RENT">{dict.auto.forRent}</option>
          </select>
          <select className="input" name="status" defaultValue={status}>
            <option value="">{t.filterAll}</option>
            {["ACTIVE", "SOLD", "PAUSED", "REMOVED"].map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="featured">{t.feature}</option>
          </select>
          <button type="submit" className="btn btn-ghost btn-sm">{dict.business.search}</button>
        </form>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.listing}</th>
              <th>{t.owner}</th>
              <th>{t.status}</th>
              <th>{t.engagement}</th>
              <th style={{ textAlign: "right" }}>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => <Row key={l.id} l={l} dict={dict} locale={locale} />)}
            {listings.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>—</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
