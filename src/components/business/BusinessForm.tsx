"use client";

import { useActionState, useState } from "react";
import { RichDescriptionField } from "@/components/RichDescriptionField";
import { createBusiness, updateBusiness } from "@/app/actions/business";
import { StateSelect } from "@/components/StateSelect";
import { PhotosField } from "@/components/estate/PhotosField";
import { CroppedUploadField } from "@/components/CroppedUploadField";
import { BUSINESS_CATEGORIES } from "@/lib/business-categories";
import { DetailsField } from "@/components/business/DetailsField";
import { SOCIAL_PLATFORMS, LANGUAGES, PAYMENT_METHODS, type DetailRow } from "@/lib/business-social";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type BusinessValues = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  /** Stored rich document, when the row has been edited since the editor shipped. */
  descriptionRich: unknown;
  city: string;
  state: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  photos: string[];
  // Storefront: location, extra channels, social, sidebar details.
  address: string;
  zip: string;
  whatsapp: string;
  bookingUrl: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTiktok: string;
  socialYoutube: string;
  socialTelegram: string;
  languages: string[];
  paymentMethods: string[];
  details: DetailRow[];
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
        <RichDescriptionField
          dict={dict}
          doc={values?.descriptionRich}
          text={values?.description}
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

      <div className="field-row">
        <Field name="address" label={t.address} defaultValue={values?.address} placeholder={t.addressPlaceholder} errors={err?.address} />
        <Field name="zip" label={t.zip} defaultValue={values?.zip} placeholder="11214" errors={err?.zip} />
      </div>

      <Field name="website" label={t.website} defaultValue={values?.website} placeholder="example.com" errors={err?.website} />
      <div className="field-row">
        <Field name="email" label={t.email} type="email" defaultValue={values?.email} errors={err?.email} />
        <Field name="phone" label={t.phone} type="tel" defaultValue={values?.phone} errors={err?.phone} />
      </div>
      <div className="field-row">
        <Field name="whatsapp" label={t.whatsapp} type="tel" defaultValue={values?.whatsapp} placeholder={t.whatsappPlaceholder} errors={err?.whatsapp} />
        <Field name="bookingUrl" label={t.bookingUrl} defaultValue={values?.bookingUrl} placeholder="https://…" errors={err?.bookingUrl} />
      </div>

      {/* Social — a handle or a link per network; either renders as a button on the profile. */}
      <div className="field">
        <label>{t.socialTitle}</label>
        <p className="muted-sm" style={{ margin: "0 0 6px" }}>{t.socialHint}</p>
        <div className="field-row">
          {SOCIAL_PLATFORMS.slice(0, 2).map((p) => (
            <Field key={p.key} name={p.field} label={`${p.icon} ${p.label}`} defaultValue={values?.[p.field]} placeholder={p.placeholder} errors={err?.[p.field]} />
          ))}
        </div>
        <div className="field-row">
          {SOCIAL_PLATFORMS.slice(2, 4).map((p) => (
            <Field key={p.key} name={p.field} label={`${p.icon} ${p.label}`} defaultValue={values?.[p.field]} placeholder={p.placeholder} errors={err?.[p.field]} />
          ))}
        </div>
        {SOCIAL_PLATFORMS.slice(4).map((p) => (
          <Field key={p.key} name={p.field} label={`${p.icon} ${p.label}`} defaultValue={values?.[p.field]} placeholder={p.placeholder} errors={err?.[p.field]} />
        ))}
      </div>

      <div className="field">
        <label>{t.languagesLabel}</label>
        <div className="check-grid">
          {LANGUAGES.map((l) => (
            <label key={l.key}>
              <input type="checkbox" name="languages" value={l.key} defaultChecked={values?.languages?.includes(l.key)} />
              {locale === "ka" ? l.ka : l.en}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label>{t.paymentsLabel}</label>
        <div className="check-grid">
          {PAYMENT_METHODS.map((p) => (
            <label key={p.key}>
              <input type="checkbox" name="paymentMethods" value={p.key} defaultChecked={values?.paymentMethods?.includes(p.key)} />
              {locale === "ka" ? p.ka : p.en}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t.detailsTitle}</label>
        <p className="muted-sm" style={{ margin: "0 0 6px" }}>{t.detailsHint}</p>
        <DetailsField initial={values?.details ?? []} labels={{ label: t.detailLabel, value: t.detailValue, add: t.addDetail, remove: dict.admin.delete }} />
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
