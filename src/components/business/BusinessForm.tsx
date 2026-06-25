"use client";

import { useActionState } from "react";
import { createBusiness, updateBusiness } from "@/app/actions/business";
import { StateSelect } from "@/components/StateSelect";
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
};

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
  const [state, action, pending] = useActionState(
    mode === "create" ? createBusiness : updateBusiness,
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
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    placeholder?: string;
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
      {mode === "edit" && <input type="hidden" name="businessId" value={values?.id ?? ""} />}

      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      <Field name="name" label={t.name} required defaultValue={values?.name} />

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

      <Field name="tagline" label={t.tagline} defaultValue={values?.tagline} placeholder={t.taglinePlaceholder} />

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

      <Field name="website" label={t.website} defaultValue={values?.website} placeholder="example.com" />
      <div className="field-row">
        <Field name="email" label={t.email} type="email" defaultValue={values?.email} />
        <Field name="phone" label={t.phone} type="tel" defaultValue={values?.phone} />
      </div>
      <Field name="logoUrl" label={t.logoUrl} defaultValue={values?.logoUrl} placeholder="https://…" />

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {mode === "create" ? t.register : dict.profile.save}
        </button>
      </div>
    </form>
  );
}
