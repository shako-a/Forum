"use client";

import { useActionState, useState } from "react";
import { saveMerchProduct, deleteMerchProduct } from "@/app/actions/admin-merch";
import { PhotosField } from "@/components/estate/PhotosField";
import { ConfirmButton } from "@/components/business/ConfirmButton";
import { MERCH_CATEGORIES } from "@/lib/merch";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type VariantRow = { id: string | null; label: string; sku: string; stock: number; priceDelta: number };
export type MerchProductValues = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number; // dollars
  photos: string[];
  active: boolean;
  featured: boolean;
  sortOrder: number;
  variants: VariantRow[];
};

// Product editor with a variant table (size/colour rows with their own stock).
export function MerchProductForm({
  locale,
  dict,
  values,
}: {
  locale: Locale;
  dict: Dictionary;
  values?: MerchProductValues;
}) {
  const t = dict.admin;
  const [state, action, pending] = useActionState(saveMerchProduct, undefined);
  const [rows, setRows] = useState<VariantRow[]>(values?.variants ?? []);
  const err = state?.errors;

  const update = (i: number, patch: Partial<VariantRow>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {values && <input type="hidden" name="productId" value={values.id} />}
      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      <div className="field">
        <label htmlFor="name">{t.merchName}<span className="req">*</span></label>
        <input id="name" name="name" className="input" defaultValue={values?.name} required maxLength={120} />
        {err?.name && <span className="field-error">{err.name.join(" ")}</span>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="category">{t.merchCategory}</label>
          <select id="category" name="category" className="input" defaultValue={values?.category ?? "apparel"}>
            {MERCH_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {locale === "ka" ? c.ka : c.en}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="price">{t.merchPrice}<span className="req">*</span></label>
          <input id="price" name="price" type="number" step="0.01" min={0} className="input" defaultValue={values?.price} required />
          {err?.price && <span className="field-error">{err.price.join(" ")}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">{t.merchDescription}<span className="req">*</span></label>
        <textarea id="description" name="description" className="input" rows={6} defaultValue={values?.description} required />
        {err?.description && <span className="field-error">{err.description.join(" ")}</span>}
      </div>
      <div className="field">
        <label>{dict.market.photos}</label>
        <PhotosField
          defaultPhotos={values?.photos ?? []}
          max={10}
          labels={{
            add: dict.estate.addPhotos,
            uploading: dict.estate.uploading,
            heroHint: dict.estate.heroHint,
            makeHero: dict.estate.makeHero,
            remove: t.delete,
          }}
        />
      </div>

      {/* Variants */}
      <div className="field">
        <label>{t.merchVariants} <span className="muted-sm">· {t.merchVariantsHint}</span></label>
        {rows.length > 0 && (
          <table className="admin-table merch-variant-table">
            <thead>
              <tr>
                <th>{t.merchVariantLabel}</th>
                <th>SKU</th>
                <th>{t.merchStock}</th>
                <th>{t.merchPriceDelta}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input type="hidden" name="vId" value={r.id ?? ""} />
                    <input name="vLabel" className="input" value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="M / Black" required />
                  </td>
                  <td><input name="vSku" className="input" value={r.sku} onChange={(e) => update(i, { sku: e.target.value })} /></td>
                  <td><input name="vStock" type="number" min={0} className="input" value={r.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} /></td>
                  <td><input name="vDelta" type="number" step="0.01" className="input" value={r.priceDelta} onChange={(e) => update(i, { priceDelta: Number(e.target.value) })} /></td>
                  <td>
                    <button type="button" className="action mod-action" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setRows((r) => [...r, { id: null, label: "", sku: "", stock: 0, priceDelta: 0 }])}
        >
          ＋ {t.merchAddVariant}
        </button>
      </div>

      <div className="field-row">
        <label className="re-active-check">
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          <span>{t.merchActive}</span>
        </label>
        <label className="re-active-check">
          <input type="checkbox" name="featured" defaultChecked={values?.featured ?? false} />
          <span>{t.merchFeatured}</span>
        </label>
        <div className="field">
          <label htmlFor="sortOrder">{t.sortOrder}</label>
          <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={values?.sortOrder ?? 0} />
        </div>
      </div>

      <div className="account-actions merch-form-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {values ? t.save : t.create}
        </button>
        {values && (
          <ConfirmButton
            action={deleteMerchProduct.bind(null, values.id, locale)}
            label={`🗑 ${t.delete}`}
            confirmText={t.confirmDelete}
            className="btn btn-danger"
          />
        )}
      </div>
    </form>
  );
}
