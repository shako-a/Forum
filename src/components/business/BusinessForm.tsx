"use client";

import { useActionState, useState } from "react";
import { createBusiness, updateBusiness } from "@/app/actions/business";
import { StateSelect } from "@/components/StateSelect";
import { PhotosField } from "@/components/estate/PhotosField";
import { CroppedUploadField } from "@/components/CroppedUploadField";
import { BUSINESS_CATEGORIES } from "@/lib/business-categories";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type BusinessValues = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  city: string;
  state: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  photos: string[];
};

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  errors,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  errors?: string[];
}) {
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
        className="input"
        required={required}
        aria-invalid={errors ? true : undefined}
      />
      {errors && <span className="field-error">{errors.join(" ")}</span>}
    </div>
  );
}

export function BusinessForm({
  locale,
  dict,
  mode,
  values,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: "create" | "edit";
  values?: Partial<BusinessValues>;
}) {
  const t = dict.business;
  // The logo is a controlled field so the uploader can fill it in, while the
  // text box still accepts a URL someone already hosts elsewhere.
  const [logoUrl, setLogoUrl] = useState(values?.logoUrl ?? "");
  const [state, action, pending] = useActionState(
    mode === "create" ? createBusiness : updateBusiness,
    undefined,
  );
  const err = state?.errors;

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && <input type="hidden" name="businessId" value={values?.id ?? ""} />}

      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      <Field name="name" label={t.name} required defaultValue={values?.name} errors={err?.name} />

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
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {locale === "ka" ? c.ka : c.en}
            </option>
          ))}
        </select>
        {err?.category && <span className="field-error">{err.category.join(" ")}</span>}
      </div>

      <Field name="tagline" label={t.tagline} defaultValue={values?.tagline} placeholder={t.taglinePlaceholder} errors={err?.tagline} />

      <div className="field">
        <label htmlFor="description">{t.description}</label>
        <textarea
          id="description"
          name="description"
          className="input"
          rows={5}
          defaultValue={values?.description}
        />
      </div>

      <div className="field-row">
        <Field name="city" label={dict.auth.city} defaultValue={values?.city} errors={err?.city} />
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

      <Field name="website" label={t.website} defaultValue={values?.website} placeholder="example.com" errors={err?.website} />
      <div className="field-row">
        <Field name="email" label={t.email} type="email" defaultValue={values?.email} errors={err?.email} />
        <Field name="phone" label={t.phone} type="tel" defaultValue={values?.phone} errors={err?.phone} />
      </div>
      {/* Logo — a small square mark, shown on the directory card and profile. */}
      <div className="field">
        <label htmlFor="logoUrl">{t.logo}</label>
        <div className="upload-row">
          <input
            id="logoUrl"
            name="logoUrl"
            className="input"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
          <CroppedUploadField
            aspect={1}
            label={t.uploadLogo}
            busyLabel={dict.estate.uploading}
            dict={dict}
            onUploaded={setLogoUrl}
          />
        </div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="biz-logo-preview" src={logoUrl} alt="" />
        )}
        {err?.logoUrl && <span className="field-error">{err.logoUrl.join(" ")}</span>}
      </div>

      {/* Gallery — the storefront, team and work that a logo alone can't show. */}
      <div className="field">
        <label>{t.photos}</label>
        <p className="muted-sm" style={{ margin: "0 0 6px" }}>{t.photosHint}</p>
        <PhotosField
          defaultPhotos={values?.photos ?? []}
          labels={{
            add: dict.estate.addPhotos,
            uploading: dict.estate.uploading,
            heroHint: dict.estate.heroHint,
            makeHero: dict.estate.makeHero,
            remove: dict.admin.delete,
          }}
        />
      </div>

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {mode === "create" ? t.register : dict.profile.save}
        </button>
      </div>
    </form>
  );
}
