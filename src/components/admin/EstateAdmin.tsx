"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setEstateFeatured, reorderEstateFeatured, setEstateActive, adminDeleteEstateListing } from "@/app/actions/admin-estate";
import { propertyTypeLabel, formatPrice } from "@/lib/estate";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminEstateListing = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  propertyType: string;
  price: number;
  location: string;
  thumb: string | null;
  active: boolean;
  featured: boolean;
  featuredOrder: number;
  views: number;
  openReports: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
};

function Row({ l, dict, locale }: { l: AdminEstateListing; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<void>) => start(() => void fn());
  return (
    <tr className={l.active ? "" : "opacity-50"}>
      <td>
        <div className="report-listing">
          <a href={`/${locale}/realestate/${l.slug}`} target="_blank" rel="noreferrer" className="report-listing-thumb">
            {l.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.thumb} alt="" />
            ) : (
              <span>🏠</span>
            )}
          </a>
          <div className="report-listing-info">
            <a href={`/${locale}/realestate/${l.slug}`} target="_blank" rel="noreferrer" className="admin-link">
              {l.featured && "★ "}{l.title}
            </a>
            <div className="muted-sm">
              {formatPrice(l.price)}{l.kind === "RENT" ? dict.estate.perMonth : ""} · {l.kind === "RENT" ? dict.estate.forRent : dict.estate.forSale} · {propertyTypeLabel(l.propertyType, locale)} · {l.location}
            </div>
          </div>
        </div>
      </td>
      <td><Link href={`/${locale}/admin/users/${l.ownerId}`} className="admin-link">{l.ownerName}</Link></td>
      <td>
        {l.active ? t.active : dict.estate.unlisted}
        {l.openReports > 0 && <div className="report-removed">⚑ {t.listingReports.replace("{n}", String(l.openReports))}</div>}
      </td>
      <td className="num">👁 {l.views}</td>
      <td style={{ textAlign: "right" }}>
        <div className="report-actions">
          {l.active && (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => setEstateFeatured(l.id, !l.featured))}>
              {l.featured ? `☆ ${t.unfeature}` : `★ ${t.feature}`}
            </button>
          )}
          {l.active ? (
            <button
              type="button"
              className="action mod-action"
              disabled={pending}
              onClick={() => {
                const reason = window.prompt(t.unlistReasonPrompt, "");
                if (reason === null) return;
                act(() => setEstateActive(l.id, false, reason));
              }}
            >
              🚫 {t.unlist}
            </button>
          ) : (
            <button type="button" className="action" disabled={pending} onClick={() => act(() => setEstateActive(l.id, true))}>
              ↻ {t.relist}
            </button>
          )}
          <button
            type="button"
            className="action mod-action"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t.confirmDelete)) act(() => adminDeleteEstateListing(l.id));
            }}
          >
            🗑 {t.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

// Banner curation: the featured listings in display order, with up/down.
function Banner({ featured, dict, locale }: { featured: AdminEstateListing[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const move = (i: number, dir: -1 | 1) => {
    const ids = featured.map((f) => f.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(() => void reorderEstateFeatured(ids));
  };
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">★ {t.estateBanner}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.estateBannerSub}</p>
      {featured.length === 0 ? (
        <p className="muted-sm">{t.estateBannerEmpty}</p>
      ) : (
        <ol className="admin-banner-list">
          {featured.map((f, i) => (
            <li key={f.id}>
              <span className="admin-banner-pos">{i + 1}</span>
              <a href={`/${locale}/realestate/${f.slug}`} target="_blank" rel="noreferrer" className="admin-link">{f.title}</a>
              <span className="muted-sm">{formatPrice(f.price)} · {f.location}</span>
              <span className="admin-banner-tools">
                <button type="button" className="action" disabled={pending || i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="action" disabled={pending || i === featured.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="action mod-action" disabled={pending} onClick={() => start(() => void setEstateFeatured(f.id, false))}>✕</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function EstateAdmin({
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
  listings: AdminEstateListing[];
  featured: AdminEstateListing[];
  q: string;
  kind: string;
  status: string;
}) {
  const t = dict.admin;
  return (
    <>
      <Banner featured={featured} dict={dict} locale={locale} />
      <div className="admin-section">
        <h2 className="admin-section-title">{t.estateListings}</h2>
        <form method="get" className="admin-filter-row">
          <input className="input" name="q" placeholder={t.searchListings} defaultValue={q} />
          <select className="input" name="kind" defaultValue={kind}>
            <option value="">{dict.estate.saleAndRent}</option>
            <option value="SALE">{dict.estate.forSale}</option>
            <option value="RENT">{dict.estate.forRent}</option>
          </select>
          <select className="input" name="status" defaultValue={status}>
            <option value="">{t.filterAll}</option>
            <option value="active">{t.active}</option>
            <option value="unlisted">{dict.estate.unlisted}</option>
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
            {listings.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>—</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
