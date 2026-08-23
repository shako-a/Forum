"use client";

import { useActionState } from "react";
import { createListing, updateListing } from "@/app/actions/estate";
import { StateSelect } from "@/components/StateSelect";
import { PhotosField } from "@/components/estate/PhotosField";
import { PROPERTY_TYPES, ESTATE_FEATURES } from "@/lib/estate";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type ListingValues = {
  id: string;
  kind: string;
  propertyType: string;
  title: string;
  description: string;
  price: number | "";
  bedrooms: number | "";
  bathrooms: number | "";
  rooms: number | "";
  areaSqFt: number | "";
  yearBuilt: number | "";
  address: string;
  city: string;
  state: string;
  contactName: string;
  phone: string;
  email: string;
  features: string[];
  photos: string[];
  active: boolean;
};

export function ListingForm({
  locale,
  dict,
  mode,
  values,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: "create" | "edit";
  values?: Partial<ListingValues>;
}) {
  const t = dict.estate;
  const [state, action, pending] = useActionState(
    mode === "create" ? createListing : updateListing,
    undefined,
  );
  const err = state?.errors;

  function Field({
    name,
    label,
    type = "text",
    required = false,
    defaultValue,
    placeholder,
    min,
    max,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    defaultValue?: string | number;
    placeholder?: string;
    min?: number;
    max?: number;
  }) {
    const messages = err?.[name];
    return (
      <div className="field">
        <label htmlFor={name}>
          {label}
          {required && <span className="req">*</span>}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          min={min}
          max={max}
          className="input"
          required={required}
          aria-invalid={messages ? true : undefined}
        />
        {messages && <span className="field-error">{messages.join(" ")}</span>}
      </div>
    );
  }

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && <input type="hidden" name="listingId" value={values?.id ?? ""} />}

      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      {/* Sale / rent */}
      <div className="field">
        <label>
          {t.kind}
          <span className="req">*</span>
        </label>
        <div className="re-kind-toggle" role="radiogroup">
          <label className="re-kind-option">
            <input type="radio" name="kind" value="SALE" defaultChecked={(values?.kind ?? "SALE") === "SALE"} />
            <span>🏷️ {t.forSale}</span>
          </label>
          <label className="re-kind-option">
            <input type="radio" name="kind" value="RENT" defaultChecked={values?.kind === "RENT"} />
            <span>🔑 {t.forRent}</span>
          </label>
        </div>
        {err?.kind && <span className="field-error">{err.kind.join(" ")}</span>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="propertyType">
            {t.propertyType}
            <span className="req">*</span>
          </label>
          <select
            id="propertyType"
            name="propertyType"
            className="input"
            defaultValue={values?.propertyType ?? ""}
            aria-invalid={err?.propertyType ? true : undefined}
          >
            <option value="" disabled>—</option>
            {PROPERTY_TYPES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.icon} {locale === "ka" ? p.ka : p.en}
              </option>
            ))}
          </select>
          {err?.propertyType && <span className="field-error">{err.propertyType.join(" ")}</span>}
        </div>
        <Field
          name="price"
          label={t.price}
          type="number"
          required
          min={1}
          defaultValue={values?.price}
          placeholder={t.pricePlaceholder}
        />
      </div>

      <Field name="title" label={t.title} required defaultValue={values?.title} placeholder={t.titlePlaceholder} />

      <div className="re-num-row">
        <Field name="bedrooms" label={t.bedrooms} type="number" min={0} defaultValue={values?.bedrooms} />
        <Field name="bathrooms" label={t.bathrooms} type="number" min={0} defaultValue={values?.bathrooms} />
        <Field name="rooms" label={t.rooms} type="number" min={0} defaultValue={values?.rooms} />
      </div>
      <div className="re-num-row">
        <Field name="areaSqFt" label={t.area} type="number" min={0} defaultValue={values?.areaSqFt} />
        <Field name="yearBuilt" label={t.yearBuilt} type="number" min={0} max={2100} defaultValue={values?.yearBuilt} />
      </div>

      <Field name="address" label={t.address} required defaultValue={values?.address} placeholder={t.addressPlaceholder} />
      <div className="field-row">
        <Field name="city" label={dict.auth.city} defaultValue={values?.city} />
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
        <label htmlFor="description">{t.description}</label>
        <textarea
          id="description"
          name="description"
          className="input"
          rows={6}
          defaultValue={values?.description}
          placeholder={t.descriptionPlaceholder}
        />
      </div>

      {/* Feature checklist */}
      <div className="field">
        <label>{t.features}</label>
        <div className="re-features-grid">
          {ESTATE_FEATURES.map((f) => (
            <label key={f.key} className="re-feature-check">
              <input
                type="checkbox"
                name="features"
                value={f.key}
                defaultChecked={values?.features?.includes(f.key)}
              />
              <span>
                {f.icon} {locale === "ka" ? f.ka : f.en}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="field">
        <label>{t.photos}</label>
        <PhotosField
          defaultPhotos={values?.photos ?? []}
          labels={{
            add: t.addPhotos,
            uploading: t.uploading,
            heroHint: t.heroHint,
            makeHero: t.makeHero,
            remove: dict.admin.delete,
          }}
        />
      </div>

      {/* Contact */}
      <Field name="contactName" label={t.contactName} defaultValue={values?.contactName} placeholder={t.contactNamePlaceholder} />
      <div className="field-row">
        <Field name="phone" label={dict.business.phone} type="tel" defaultValue={values?.phone} />
        <Field name="email" label={dict.business.email} type="email" defaultValue={values?.email} />
      </div>

      {mode === "edit" && (
        <label className="re-active-check">
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          <span>{t.activeLabel}</span>
        </label>
      )}

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {mode === "create" ? t.publish : dict.profile.save}
        </button>
      </div>
    </form>
  );
}
