"use client";

import { useActionState, useState } from "react";
import { createMarketListing, updateMarketListing } from "@/app/actions/market";
import { StateSelect } from "@/components/StateSelect";
import { PhotosField } from "@/components/estate/PhotosField";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, MARKET_PRICE_TYPES } from "@/lib/market";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type MarketListingValues = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  priceType: string;
  price: number;
  city: string;
  zip: string;
  state: string;
  localPickup: boolean;
  localDelivery: boolean;
  canShip: boolean;
  phone: string;
  photos: string[];
};

export function MarketListingForm({
  locale,
  dict,
  mode,
  values,
  actingAs,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: "create" | "edit";
  values?: Partial<MarketListingValues>;
  actingAs?: string | null; // business name when listing as a business
}) {
  const t = dict.market;
  const [state, action, pending] = useActionState(
    mode === "create" ? createMarketListing : updateMarketListing,
    undefined,
  );
  const err = state?.errors;
  const [priceType, setPriceType] = useState(values?.priceType ?? "FIXED");

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && <input type="hidden" name="listingId" value={values?.id ?? ""} />}

      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}
      {mode === "create" && actingAs && (
        <p className="mk-acting-note">🏢 {t.listingAs.replace("{name}", actingAs)}</p>
      )}

      {/* Photos first — the cover shot is what sells the item */}
      <div className="field">
        <label>
          {t.photos} <span className="muted-sm">· {t.photosHint}</span>
        </label>
        <PhotosField
          defaultPhotos={values?.photos ?? []}
          max={10}
          labels={{
            add: dict.estate.addPhotos,
            uploading: dict.estate.uploading,
            heroHint: dict.estate.heroHint,
            makeHero: dict.estate.makeHero,
            remove: dict.admin.delete,
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="title">
          {t.title}
          <span className="req">*</span>
        </label>
        <input
          id="title"
          name="title"
          className="input"
          defaultValue={values?.title}
          placeholder={t.titlePlaceholder}
          maxLength={120}
          required
          aria-invalid={err?.title ? true : undefined}
        />
        {err?.title && <span className="field-error">{err.title.join(" ")}</span>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="category">
            {t.category}
            <span className="req">*</span>
          </label>
          <select
            id="category"
            name="category"
            className="input"
            defaultValue={values?.category ?? ""}
            aria-invalid={err?.category ? true : undefined}
          >
            <option value="" disabled>—</option>
            {MARKET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {locale === "ka" ? c.ka : c.en}
              </option>
            ))}
          </select>
          {err?.category && <span className="field-error">{err.category.join(" ")}</span>}
        </div>
        <div className="field">
          <label htmlFor="condition">
            {t.condition}
            <span className="req">*</span>
          </label>
          <select
            id="condition"
            name="condition"
            className="input"
            defaultValue={values?.condition ?? ""}
            aria-invalid={err?.condition ? true : undefined}
          >
            <option value="" disabled>—</option>
            {MARKET_CONDITIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {locale === "ka" ? c.ka : c.en}
              </option>
            ))}
          </select>
          {err?.condition && <span className="field-error">{err.condition.join(" ")}</span>}
        </div>
      </div>

      {/* Price */}
      <div className="field">
        <label>
          {t.price}
          <span className="req">*</span>
        </label>
        <div className="mk-pricetype" role="radiogroup">
          {MARKET_PRICE_TYPES.map((p) => (
            <label key={p.key} className="re-kind-option">
              <input
                type="radio"
                name="priceType"
                value={p.key}
                checked={priceType === p.key}
                onChange={() => setPriceType(p.key)}
              />
              <span>
                {p.icon} {locale === "ka" ? p.ka : p.en}
              </span>
            </label>
          ))}
        </div>
        <div className="mk-price-input">
          <span className="mk-price-currency">$</span>
          <input
            name="price"
            type="number"
            min={0}
            step={1}
            className="input"
            defaultValue={values?.price && values.price > 0 ? values.price : ""}
            placeholder={priceType === "FREE" ? "0" : t.pricePlaceholder}
            disabled={priceType === "FREE"}
            aria-invalid={err?.price ? true : undefined}
          />
        </div>
        {err?.price && <span className="field-error">{err.price.join(" ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="description">
          {t.description}
          <span className="req">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="input"
          rows={7}
          defaultValue={values?.description}
          placeholder={t.descriptionPlaceholder}
          maxLength={6000}
          aria-invalid={err?.description ? true : undefined}
        />
        {err?.description && <span className="field-error">{err.description.join(" ")}</span>}
      </div>

      {/* Location + delivery */}
      <div className="field-row">
        <div className="field">
          <label htmlFor="city">{dict.auth.city}</label>
          <input id="city" name="city" className="input" defaultValue={values?.city} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="zip">
            {t.zip} <span className="muted-sm">· {t.zipHint}</span>
          </label>
          <input
            id="zip"
            name="zip"
            className="input"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="10001"
            maxLength={10}
            defaultValue={values?.zip}
            aria-invalid={err?.zip ? true : undefined}
          />
          {err?.zip && <span className="field-error">{err.zip.join(" ")}</span>}
        </div>
        <StateSelect
          name="state"
          label={dict.auth.state}
          locale={locale}
          defaultValue={values?.state ?? ""}
          usGroupLabel={dict.auth.usStates}
          error={err?.state}
          geolocate={mode === "create"}
        />
      </div>
      <div className="field">
        <label>{t.delivery}</label>
        <div className="mk-delivery">
          <label className="re-feature-check">
            <input type="checkbox" name="localPickup" defaultChecked={values?.localPickup ?? true} />
            <span>🤝 {t.localPickup}</span>
          </label>
          <label className="re-feature-check">
            <input type="checkbox" name="localDelivery" defaultChecked={values?.localDelivery ?? false} />
            <span>🚗 {t.localDelivery}</span>
          </label>
          <label className="re-feature-check">
            <input type="checkbox" name="canShip" defaultChecked={values?.canShip ?? false} />
            <span>📦 {t.canShip}</span>
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="phone">
          {dict.business.phone} <span className="muted-sm">· {t.phoneHint}</span>
        </label>
        <input id="phone" name="phone" type="tel" className="input" defaultValue={values?.phone} maxLength={40} />
      </div>

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {mode === "create" ? t.publish : dict.profile.save}
        </button>
      </div>
    </form>
  );
}
