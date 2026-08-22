"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  adminCreateBusiness,
  setBusinessVerified,
  setBusinessFeatured,
  removeBusiness,
} from "@/app/actions/admin-business";
import { IdCell } from "@/components/admin/IdCell";
import { BUSINESS_CATEGORIES, businessCategoryLabel } from "@/lib/business-categories";
import { StateSelect } from "@/components/StateSelect";
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
      <td><IdCell id={b.id} /></td>
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

function AddBusinessForm({ dict, locale, onDone }: { dict: Dictionary; locale: Locale; onDone: () => void }) {
  const t = dict.admin;
  const tb = dict.business;
  const [state, action, pending] = useActionState(adminCreateBusiness, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  const err = state?.errors;
  return (
    <form ref={formRef} action={action} className="admin-add-form">
      <p className="muted-sm" style={{ margin: "0 0 12px" }}>{t.addBusinessHint}</p>
      <div className="admin-add-grid">
        <label>
          <span>{tb.name}</span>
          <input className="input" type="text" name="name" autoComplete="off" required />
          {err?.name && <span className="field-error">{err.name[0]}</span>}
        </label>
        <label>
          <span>{tb.category}</span>
          <select className="input" name="category" defaultValue="">
            <option value="" disabled>—</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {locale === "ka" ? c.ka : c.en}
              </option>
            ))}
          </select>
          {err?.category && <span className="field-error">{err.category[0]}</span>}
        </label>
        <StateSelect
          name="state"
          label={dict.auth.state}
          locale={locale}
          usGroupLabel={dict.auth.usStates}
          error={err?.state}
        />
        <label>
          <span>{tb.owner}</span>
          <input
            className="input"
            type="text"
            name="ownerForumName"
            autoComplete="off"
            placeholder={t.ownerPlaceholder}
          />
          {err?.ownerForumName && <span className="field-error">{err.ownerForumName[0]}</span>}
        </label>
      </div>
      {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
      <div className="admin-add-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.create}
        </button>
        <button type="button" className="btn" onClick={onDone} disabled={pending}>
          {t.cancel}
        </button>
      </div>
    </form>
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
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="admin-list-head">
        <h1 className="admin-h1" style={{ margin: 0 }}>{t.directory}</h1>
        {!adding && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + {dict.admin.addBusiness}
          </button>
        )}
      </div>
      {adding && <AddBusinessForm dict={dict} locale={locale} onDone={() => setAdding(false)} />}
      <table className="admin-table">
        <thead>
          <tr>
            <th>{dict.admin.id}</th>
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
              <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {dict.admin.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
