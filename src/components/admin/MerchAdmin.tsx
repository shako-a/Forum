"use client";

import Link from "@/components/Link";
import { useTransition } from "react";
import { setMerchProductFlag } from "@/app/actions/admin-merch";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminMerchProduct = {
  id: string;
  slug: string;
  name: string;
  priceLabel: string;
  thumb: string | null;
  active: boolean;
  featured: boolean;
  stock: number | null; // null = no variants (always in stock)
  variantCount: number;
  ordered: number; // order items referencing it
};

function Row({ p, dict, locale }: { p: AdminMerchProduct; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  return (
    <tr className={p.active ? "" : "opacity-50"}>
      <td>
        <div className="report-listing">
          <Link href={`/${locale}/admin/merch/${p.id}`} className="report-listing-thumb">
            {p.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumb} alt="" />
            ) : (
              <span>🧢</span>
            )}
          </Link>
          <div className="report-listing-info">
            <Link href={`/${locale}/admin/merch/${p.id}`} className="admin-link">{p.name}</Link>
            <div className="muted-sm">{p.priceLabel}</div>
          </div>
        </div>
      </td>
      <td>
        {p.stock === null ? "∞" : <span className={p.stock <= 3 ? "report-removed" : ""}>{p.stock}</span>}
        <span className="muted-sm"> · {p.variantCount} {t.merchVariantsShort}</span>
      </td>
      <td className="num">{p.ordered}</td>
      <td>
        <label className="admin-toggle">
          <input type="checkbox" checked={p.active} disabled={pending} onChange={(e) => start(() => void setMerchProductFlag(p.id, "active", e.target.checked))} />
          <span>{t.merchActive}</span>
        </label>
        <label className="admin-toggle">
          <input type="checkbox" checked={p.featured} disabled={pending} onChange={(e) => start(() => void setMerchProductFlag(p.id, "featured", e.target.checked))} />
          <span>{t.merchFeatured}</span>
        </label>
      </td>
      <td style={{ textAlign: "right" }}>
        <Link href={`/${locale}/admin/merch/${p.id}`} className="action">✏️ {t.edit}</Link>{" "}
        <a href={`/${locale}/market/merch/${p.slug}`} target="_blank" rel="noreferrer" className="action">↗</a>
      </td>
    </tr>
  );
}

export function MerchAdmin({ dict, locale, products }: { dict: Dictionary; locale: Locale; products: AdminMerchProduct[] }) {
  const t = dict.admin;
  return (
    <div className="admin-section">
      <div className="admin-list-head">
        <h2 className="admin-section-title">{t.merchProducts}</h2>
        <Link href={`/${locale}/admin/merch/new`} className="btn btn-primary btn-sm">＋ {t.merchNewProduct}</Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.merchProduct}</th>
            <th>{t.merchStock}</th>
            <th>{t.merchOrdered}</th>
            <th>{t.status}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => <Row key={p.id} p={p} dict={dict} locale={locale} />)}
          {products.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t.merchNoProducts}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
