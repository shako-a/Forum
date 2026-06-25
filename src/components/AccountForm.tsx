"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { StateSelect } from "@/components/StateSelect";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AccountValues = {
  email: string;
  forumName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state: string;
  hideRealName: boolean;
};

export function AccountForm({
  locale,
  dict,
  values,
}: {
  locale: Locale;
  dict: Dictionary;
  values: AccountValues;
}) {
  const t = dict.auth;
  const tp = dict.profile;
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const err = state?.errors;

  function Field({
    name,
    label,
    type = "text",
    required = true,
    autoComplete,
    hint,
    defaultValue,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
    hint?: string;
    defaultValue?: string;
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
          autoComplete={autoComplete}
          className="input"
          required={required}
          aria-invalid={messages ? true : undefined}
        />
        {hint && !messages && <span className="field-hint">{hint}</span>}
        {messages && <span className="field-error">{messages.join(" ")}</span>}
      </div>
    );
  }

  return (
    <form action={action} className="card card-pad account-form">
      {state?.ok && (
        <p className="auth-ok" role="status">
          ✓ {tp.saved}
        </p>
      )}
      {state?.message && !state.ok && (
        <p className="auth-alert" role="alert">
          {state.message}
        </p>
      )}

      <Field name="forumName" label={t.forumName} autoComplete="username" defaultValue={values.forumName} />

      <div className="field-row">
        <Field name="firstName" label={t.firstName} autoComplete="given-name" defaultValue={values.firstName} />
        <Field name="lastName" label={t.lastName} autoComplete="family-name" defaultValue={values.lastName} />
      </div>

      <label className="checkbox-row">
        <input type="checkbox" name="hideRealName" defaultChecked={values.hideRealName} />
        {t.hideRealName}
      </label>

      <Field name="email" label={t.email} type="email" autoComplete="email" defaultValue={values.email} />
      <Field name="phone" label={t.phone} type="tel" autoComplete="tel" defaultValue={values.phone} hint={tp.phoneHint} />

      <div className="field-row">
        <Field
          name="city"
          label={t.city}
          required={false}
          autoComplete="address-level2"
          defaultValue={values.city}
        />
        <StateSelect
          name="state"
          label={t.state}
          locale={locale}
          defaultValue={values.state}
          usGroupLabel={t.usStates}
          error={err?.state}
          geolocate
        />
      </div>

      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {tp.save}
        </button>
        <Link href={`/${locale}/u/${values.forumName}`} className="btn btn-ghost">
          {tp.viewProfile}
        </Link>
      </div>
    </form>
  );
}
