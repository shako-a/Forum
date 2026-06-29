"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setBusinessVerified, setBusinessFeatured, removeBusiness } from "@/app/actions/admin-business";
import { businessCategoryLabel } from "@/lib/business-categories";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminBusiness = {
  id: string;
  slug: string;
  name: string;
  category: string;
  verified: boolean;
  featured: boolean;
  ratingCount: number;
  owner: { forumName: string };
};

function Row({ b, dict, locale }: { b: AdminBusiness; dict: Dictionary; locale: Locale }) {
  const t = dict.business;
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td>
        <Link href={`/${locale}/business/${b.slug}`} className="admin-user-link">{b.name}</Link>
      </td>
      <td style={{ color: "var(--muted)" }}>{businessCategoryLabel(b.category, locale)}</td>
      <td style={{ color: "var(--muted)" }}>{b.owner.forumName}</td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          onClick={() => startTransition(() => void setBusinessVerified(b.id, !b.verified))}
        >
          {b.verified ? "✓ " + t.verified : "— " + t.verified}
        </button>
      </td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          onClick={() => startTransition(() => void setBusinessFeatured(b.id, !b.featured))}
        >
          {b.featured ? "★ " + t.featured : "— " + t.featured}
        </button>
      </td>
      <td style={{ textAlign: "right" }}>
        <button
          type="button"
          className="action mod-action"
          disabled={pending}
          onClick={() => {
            if (window.confirm(t.confirmDeleteBusiness)) startTransition(() => void removeBusiness(b.id));
          }}
        >
          🗑 {dict.admin.delete}
        </button>
      </td>
    </tr>
  );
}

export function BusinessAdmin({
  dict,
  locale,
  businesses,
}: {
  dict: Dictionary;
  locale: Locale;
  businesses: AdminBusiness[];
}) {
  const t = dict.business;
  return (
    <div>
      <h1 className="admin-h1">{t.directory}</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.name}</th>
            <th>{t.category}</th>
            <th>{t.owner}</th>
            <th>{t.verified}</th>
            <th>{t.featured}</th>
            <th style={{ textAlign: "right" }}>{dict.admin.actions}</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((b) => (
            <Row key={b.id} b={b} dict={dict} locale={locale} />
          ))}
          {businesses.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {dict.admin.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
