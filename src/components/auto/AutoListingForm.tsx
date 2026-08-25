"use client";

import { useActionState, useState } from "react";
import { createAutoListing, updateAutoListing } from "@/app/actions/auto";
import { StateSelect } from "@/components/StateSelect";
import { PhotosField } from "@/components/estate/PhotosField";
import {
  AUTO_MAKES,
  makeKey,
  AUTO_BODY_TYPES,
  AUTO_TRANSMISSIONS,
  AUTO_FUELS,
  AUTO_DRIVETRAINS,
  AUTO_CONDITIONS,
  AUTO_FEATURES,
  AUTO_MIN_YEAR,
  AUTO_MAX_YEAR,
} from "@/lib/auto";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AutoListingValues = {
  id: string;
  kind: string;
  year: number | "";
  make: string;
  makeOther: string;
  model: string;
  bodyType: string;
  mileage: number | "";
  transmission: string;
  fuel: string;
  drivetrain: string;
  color: string;
  condition: string;
  vin: string;
  price: number | "";
  negotiable: boolean;
  insured: boolean;
  minRentalDays: number | "";
  depositAmount: number | "";
  description: string;
  features: string[];
  photos: string[];
  city: string;
  zip: string;
  state: string;
  contactName: string;
  phone: string;
  email: string;
};

type Errs = Record<string, string[] | undefined> | undefined;
type Opt = { key: string; icon: string; en: string; ka: string };

// Field helpers live at module level so their identity is stable across
// re-renders — defining them inside the component would remount every input
// (and wipe what the user typed) each time `kind` or `make` changes.
function Field({
  err,
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  min,
  max,
  hint,
}: {
  err: Errs;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  hint?: string;
}) {
  const messages = err?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="req">*</span>}
        {hint && <span className="muted-sm"> · {hint}</span>}
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

function Select({
  err,
  locale,
  name,
  label,
  options,
  defaultValue,
  required = false,
  anyLabel,
}: {
  err: Errs;
  locale: Locale;
  name: string;
  label: string;
  options: Opt[];
  defaultValue?: string;
  required?: boolean;
  anyLabel?: string;
}) {
  const messages = err?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      <select id={name} name={name} className="input" defaultValue={defaultValue ?? ""} aria-invalid={messages ? true : undefined}>
        <option value="" disabled={required}>{anyLabel ?? "—"}</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.icon} {locale === "ka" ? o.ka : o.en}</option>
        ))}
      </select>
      {messages && <span className="field-error">{messages.join(" ")}</span>}
    </div>
  );
}

export function AutoListingForm({
  locale,
  dict,
  mode,
  values,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: "create" | "edit";
  values?: Partial<AutoListingValues>;
}) {
  const t = dict.auto;
  const [state, action, pending] = useActionState(mode === "create" ? createAutoListing : updateAutoListing, undefined);
  const err = state?.errors;
  const [kind, setKind] = useState(values?.kind ?? "SALE");
  const [make, setMake] = useState(values?.make ?? "");
  const isRent = kind === "RENT";
  const lbl = (d: { en: string; ka: string }) => (locale === "ka" ? d.ka : d.en);

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && <input type="hidden" name="listingId" value={values?.id ?? ""} />}
      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      {/* Sale / rental */}
      <div className="field">
        <label>{t.kind}<span className="req">*</span></label>
        <div className="re-kind-toggle" role="radiogroup">
          <label className="re-kind-option">
            <input type="radio" name="kind" value="SALE" checked={kind === "SALE"} onChange={() => setKind("SALE")} />
            <span>🏷️ {t.forSale}</span>
          </label>
          <label className="re-kind-option">
            <input type="radio" name="kind" value="RENT" checked={kind === "RENT"} onChange={() => setKind("RENT")} />
            <span>🔑 {t.forRent}</span>
          </label>
        </div>
      </div>

      {/* Photos */}
      <div className="field">
        <label>{dict.estate.photos} <span className="muted-sm">· {dict.market.photosHint}</span></label>
        <PhotosField
          defaultPhotos={values?.photos ?? []}
          max={12}
          labels={{
            add: dict.estate.addPhotos,
            uploading: dict.estate.uploading,
            heroHint: dict.estate.heroHint,
            makeHero: dict.estate.makeHero,
            remove: dict.admin.delete,
          }}
        />
      </div>

      {/* Year / make / model */}
      <div className="re-num-row">
        <Field err={err} name="year" label={t.year} type="number" required min={AUTO_MIN_YEAR} max={AUTO_MAX_YEAR} defaultValue={values?.year} placeholder="2019" />
        <div className="field">
          <label htmlFor="make">{t.make}<span className="req">*</span></label>
          <select id="make" name="make" className="input" value={make} onChange={(e) => setMake(e.target.value)} aria-invalid={err?.make ? true : undefined}>
            <option value="" disabled>—</option>
            {AUTO_MAKES.map((m) => (
              <option key={m} value={makeKey(m)}>{m}</option>
            ))}
            <option value="other">{t.otherMake}</option>
          </select>
          {err?.make && <span className="field-error">{err.make.join(" ")}</span>}
        </div>
        <Field err={err} name="model" label={t.model} required defaultValue={values?.model} placeholder="Camry" />
      </div>
      {make === "other" && (
        <Field err={err} name="makeOther" label={t.otherMake} required defaultValue={values?.makeOther} placeholder="e.g. Suzuki" />
      )}

      {/* Facts */}
      <div className="re-num-row">
        <Select err={err} locale={locale} name="bodyType" label={t.bodyType} options={AUTO_BODY_TYPES} defaultValue={values?.bodyType} />
        <Field err={err} name="mileage" label={t.mileage} type="number" min={0} defaultValue={values?.mileage} placeholder="45000" />
        <Field err={err} name="color" label={t.color} defaultValue={values?.color} />
      </div>
      <div className="re-num-row">
        <Select err={err} locale={locale} name="transmission" label={t.transmission} options={AUTO_TRANSMISSIONS} defaultValue={values?.transmission} />
        <Select err={err} locale={locale} name="fuel" label={t.fuel} options={AUTO_FUELS} defaultValue={values?.fuel} />
        <Select err={err} locale={locale} name="drivetrain" label={t.drivetrain} options={AUTO_DRIVETRAINS} defaultValue={values?.drivetrain} />
      </div>
      {!isRent && (
        <div className="field-row">
          <Select err={err} locale={locale} name="condition" label={t.condition} options={AUTO_CONDITIONS} defaultValue={values?.condition ?? "USED"} required />
          <Field err={err} name="vin" label="VIN" hint={dict.market.zipHint} defaultValue={values?.vin} placeholder="17 characters" />
        </div>
      )}

      {/* Price */}
      <div className="field-row">
        <Field
          err={err}
          name="price"
          label={isRent ? t.pricePerDay : t.price}
          type="number"
          required
          min={1}
          defaultValue={values?.price}
          placeholder={isRent ? "65" : "12500"}
        />
        <label className="re-active-check auto-check-inline">
          <input type="checkbox" name="negotiable" defaultChecked={values?.negotiable ?? false} />
          <span>🤝 {t.negotiable}</span>
        </label>
      </div>

      {/* Rental-only */}
      {isRent && (
        <div className="auto-rental-box">
          <label className="re-active-check">
            <input type="checkbox" name="insured" defaultChecked={values?.insured ?? false} />
            <span>🛡️ {t.insured} <span className="muted-sm">· {t.insuredHint}</span></span>
          </label>
          <div className="field-row">
            <Field err={err} name="minRentalDays" label={t.minRentalDays} type="number" min={1} max={365} defaultValue={values?.minRentalDays} placeholder="1" />
            <Field err={err} name="depositAmount" label={t.deposit} type="number" min={0} defaultValue={values?.depositAmount} placeholder="200" />
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="description">{t.description}</label>
        <textarea id="description" name="description" className="input" rows={6} defaultValue={values?.description} placeholder={t.descriptionPlaceholder} maxLength={6000} />
      </div>

      {/* Features */}
      <div className="field">
        <label>{t.features}</label>
        <div className="re-features-grid">
          {AUTO_FEATURES.filter((f) => !f.rental || isRent).map((f) => (
            <label key={f.key} className="re-feature-check">
              <input type="checkbox" name="features" value={f.key} defaultChecked={values?.features?.includes(f.key)} />
              <span>{f.icon} {lbl(f)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="field-row">
        <Field err={err} name="city" label={dict.auth.city} defaultValue={values?.city} />
        <Field err={err} name="zip" label={dict.market.zip} hint={dict.market.zipHint} defaultValue={values?.zip} placeholder="10001" />
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

      {/* Contact */}
      <Field err={err} name="contactName" label={dict.estate.contactName} defaultValue={values?.contactName} placeholder={dict.estate.contactNamePlaceholder} />
      <div className="field-row">
        <Field err={err} name="phone" label={dict.business.phone} type="tel" defaultValue={values?.phone} />
        <Field err={err} name="email" label={dict.business.email} type="email" defaultValue={values?.email} />
      </div>

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {mode === "create" ? t.publish : dict.profile.save}
        </button>
      </div>
    </form>
  );
}
