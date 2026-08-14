"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createPackage, updatePackage } from "@/app/actions/admin-packages";
import { formatPrice } from "@/lib/tiers";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type EditablePackage = {
  id: string;
  key: string;
  slug: string;
  isBuiltIn: boolean;
  nameEn: string;
  nameKa: string;
  blurbEn: string;
  blurbKa: string;
  pitchEn: string;
  pitchKa: string;
  icon: string;
  accent: string;
  priceCents: number;
  discountType: "PERCENT" | "FIXED" | null;
  discountPercent: number | null;
  discountPriceCents: number | null;
  /** Pre-formatted for <input type="datetime-local">, or "" when unset. */
  discountStartsAt: string;
  discountEndsAt: string;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  /** featureId → listed / included. */
  selected: Record<string, boolean>;
};

export type PickableFeature = { id: string; key: string; name: string };

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

const dollars = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "");

export function PackageEdit({
  locale,
  dict,
  pkg,
  features,
}: {
  locale: Locale;
  dict: Dictionary;
  /** undefined → creating a new package. */
  pkg?: EditablePackage;
  features: PickableFeature[];
}) {
  const t = dict.admin.pkg;
  const isEdit = !!pkg;
  const [state, action, pending] = useActionState(isEdit ? updatePackage : createPackage, undefined);

  // Controlled where the form's own shape depends on the value: the discount
  // fields shown follow the chosen type, and the live price preview needs both.
  const [discountType, setDiscountType] = useState<"" | "PERCENT" | "FIXED">(
    pkg?.discountType ?? "",
  );
  const [price, setPrice] = useState(dollars(pkg?.priceCents ?? 0));
  const [percent, setPercent] = useState(String(pkg?.discountPercent ?? ""));
  const [promo, setPromo] = useState(
    pkg?.discountPriceCents != null ? dollars(pkg.discountPriceCents) : "",
  );

  // Which perks this package lists, and which of those are marked "not
  // included" (rendered struck through on the public card).
  const [listed, setListed] = useState<Set<string>>(
    new Set(Object.keys(pkg?.selected ?? {})),
  );
  const [excluded, setExcluded] = useState<Set<string>>(
    new Set(Object.entries(pkg?.selected ?? {}).filter(([, inc]) => !inc).map(([id]) => id)),
  );

  function toggleListed(id: string) {
    setListed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setExcluded((e) => {
          const n = new Set(e);
          n.delete(id); // dropping a perk also drops its exclusion mark
          return n;
        });
      } else next.add(id);
      return next;
    });
  }

  const priceCents = Math.round((parseFloat(price) || 0) * 100);
  const previewCents =
    discountType === "PERCENT"
      ? Math.round(priceCents * (1 - (parseInt(percent, 10) || 0) / 100))
      : discountType === "FIXED"
        ? Math.round((parseFloat(promo) || 0) * 100)
        : priceCents;
  const previewValid = previewCents >= 0 && previewCents < priceCents;

  return (
    <>
      <div className="admin-head flex items-center justify-between gap-4">
        <div>
          <Link href={`/${locale}/admin/more`} className="tier-back">
            ← {t.back}
          </Link>
          <h1 className="admin-h1">{isEdit ? t.editPackage : t.newPackage}</h1>
          {pkg?.isBuiltIn && <p className="admin-sub">{t.builtInHint}</p>}
        </div>
      </div>

      <form action={action} className="admin-form pkg-form">
        {isEdit && <input type="hidden" name="id" value={pkg.id} />}
        {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
        {state?.ok && <p className="auth-ok">{state.message}</p>}

        <section className="admin-section">
          <div className="pkg-grid">
            <label className="field">
              <span>{t.nameEn}</span>
              <input name="nameEn" className="input" defaultValue={pkg?.nameEn} required />
              <FieldError msgs={state?.errors?.nameEn} />
            </label>
            <label className="field">
              <span>{t.nameKa}</span>
              <input name="nameKa" className="input" defaultValue={pkg?.nameKa} required />
              <FieldError msgs={state?.errors?.nameKa} />
            </label>

            <label className="field">
              <span>{t.blurbEn}</span>
              <input name="blurbEn" className="input" defaultValue={pkg?.blurbEn} required />
              <span className="field-hint">{t.blurbHint}</span>
              <FieldError msgs={state?.errors?.blurbEn} />
            </label>
            <label className="field">
              <span>{t.blurbKa}</span>
              <input name="blurbKa" className="input" defaultValue={pkg?.blurbKa} required />
              <FieldError msgs={state?.errors?.blurbKa} />
            </label>

            <label className="field">
              <span>{t.pitchEn}</span>
              <textarea name="pitchEn" className="input" rows={4} defaultValue={pkg?.pitchEn} />
              <span className="field-hint">{t.pitchHint}</span>
            </label>
            <label className="field">
              <span>{t.pitchKa}</span>
              <textarea name="pitchKa" className="input" rows={4} defaultValue={pkg?.pitchKa} />
            </label>

            <label className="field">
              <span>{t.slug}</span>
              <input name="slug" className="input" defaultValue={pkg?.slug} />
              <span className="field-hint">{t.slugHint}</span>
            </label>
            <div className="field-row">
              <label className="field">
                <span>{t.icon}</span>
                <input name="icon" className="input" defaultValue={pkg?.icon ?? "✦"} maxLength={8} />
              </label>
              <label className="field">
                <span>{t.accent}</span>
                <input
                  type="color"
                  name="accent"
                  className="admin-color-input"
                  defaultValue={pkg?.accent ?? "#1f4e9c"}
                />
              </label>
              <label className="field">
                <span>{t.order}</span>
                <input
                  type="number"
                  name="sortOrder"
                  className="input"
                  defaultValue={pkg?.sortOrder ?? 0}
                />
              </label>
            </div>
          </div>

          <div className="field-row">
            <label className="admin-check">
              <input type="checkbox" name="isActive" defaultChecked={pkg?.isActive ?? true} />
              {t.active}
            </label>
            <label className="admin-check">
              <input type="checkbox" name="featured" defaultChecked={pkg?.featured ?? false} />
              {t.featured}
            </label>
          </div>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">
            {t.price} · {t.discount}
          </h2>
          <div className="field-row">
            <label className="field">
              <span>{t.price}</span>
              <input
                type="number"
                name="priceCents"
                className="input"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <span className="field-hint">{t.priceHint}</span>
              <FieldError msgs={state?.errors?.priceCents} />
            </label>

            <label className="field">
              <span>{t.discount}</span>
              <select
                name="discountType"
                className="input"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
              >
                <option value="">{t.discountNone}</option>
                <option value="PERCENT">{t.discountPercent}</option>
                <option value="FIXED">{t.discountFixed}</option>
              </select>
            </label>

            {discountType === "PERCENT" && (
              <label className="field">
                <span>{t.percentOff}</span>
                <input
                  type="number"
                  name="discountPercent"
                  className="input"
                  min="1"
                  max="99"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
                <FieldError msgs={state?.errors?.discountPercent} />
              </label>
            )}
            {discountType === "FIXED" && (
              <label className="field">
                <span>{t.promoPrice}</span>
                <input
                  type="number"
                  name="discountPriceCents"
                  className="input"
                  step="0.01"
                  min="0"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                />
                <FieldError msgs={state?.errors?.discountPriceCents} />
              </label>
            )}
          </div>

          {discountType && (
            <>
              <div className="field-row">
                <label className="field">
                  <span>{t.startsAt}</span>
                  <input
                    type="datetime-local"
                    name="discountStartsAt"
                    className="input"
                    defaultValue={pkg?.discountStartsAt}
                  />
                </label>
                <label className="field">
                  <span>{t.endsAt}</span>
                  <input
                    type="datetime-local"
                    name="discountEndsAt"
                    className="input"
                    defaultValue={pkg?.discountEndsAt}
                  />
                  <FieldError msgs={state?.errors?.discountEndsAt} />
                </label>
              </div>
              <p className="field-hint">{t.discountHint}</p>
              {/* Shows the actual sell price before saving, so a mistyped
                  percentage or promo is obvious immediately. */}
              <p className="pkg-preview">
                {previewValid ? (
                  <>
                    <s>{formatPrice(priceCents)}</s> <strong>{formatPrice(previewCents)}</strong>
                    <span className="tier-per">{dict.tiers.perMonth}</span>
                  </>
                ) : (
                  <strong>{formatPrice(priceCents)}</strong>
                )}
              </p>
            </>
          )}
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">{t.perks}</h2>
          <p className="field-hint">{t.perksHint}</p>
          {features.length === 0 ? (
            <p className="muted-sm">{t.noFeatures}</p>
          ) : (
            <ul className="perk-picker">
              {features.map((f) => {
                const on = listed.has(f.id);
                const off = excluded.has(f.id);
                return (
                  <li key={f.id} className={on ? "on" : undefined}>
                    <label className="admin-check">
                      <input
                        type="checkbox"
                        name="featureIds"
                        value={f.id}
                        checked={on}
                        onChange={() => toggleListed(f.id)}
                      />
                      {f.name}
                    </label>
                    {on && (
                      <label className="admin-check perk-excl">
                        <input
                          type="checkbox"
                          name="excludedIds"
                          value={f.id}
                          checked={off}
                          onChange={() =>
                            setExcluded((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.id)) next.delete(f.id);
                              else next.add(f.id);
                              return next;
                            })
                          }
                        />
                        {t.notIncluded}
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="admin-form-actions">
          <button className="btn btn-primary" disabled={pending}>
            {isEdit ? dict.common.save : t.create}
          </button>
          <Link href={`/${locale}/admin/more`} className="btn btn-ghost">
            {dict.common.cancel}
          </Link>
        </div>
      </form>
    </>
  );
}
