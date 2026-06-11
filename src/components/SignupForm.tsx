"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { AuthBrand } from "@/components/AuthBrand";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function SignupForm({
  locale,
  dict,
  next,
}: {
  locale: Locale;
  dict: Dictionary;
  next?: string;
}) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(signup, undefined);
  const err = state?.errors;

  function Field({
    name,
    label,
    type = "text",
    required = true,
    autoComplete,
    hint,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
    hint?: string;
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
    <div className="auth-card">
      <AuthBrand locale={locale} appName={dict.common.appName} />
      <h1 className="auth-title">{t.signupTitle}</h1>
      <p className="auth-sub">{dict.common.tagline}</p>

      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}

        {state?.message && (
          <p className="auth-alert" role="alert">
            {state.message}
          </p>
        )}

        <Field name="forumName" label={t.forumName} autoComplete="username" />

        <div className="field-row">
          <Field name="firstName" label={t.firstName} autoComplete="given-name" />
          <Field name="lastName" label={t.lastName} autoComplete="family-name" />
        </div>

        <label className="checkbox-row">
          <input type="checkbox" name="hideRealName" />
          {t.hideRealName}
        </label>

        <Field name="email" label={t.email} type="email" autoComplete="email" />
        <Field
          name="password"
          label={t.password}
          type="password"
          autoComplete="new-password"
          hint={t.passwordHint}
        />
        <Field name="phone" label={t.phone} type="tel" autoComplete="tel" />

        <div className="field-row">
          <Field name="city" label={t.city} required={false} autoComplete="address-level2" />
          <Field name="state" label={t.state} autoComplete="address-level1" />
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary btn-full">
          {t.submitSignup}
        </button>
      </form>

      <p className="auth-foot">
        {t.haveAccount} <Link href={`/${locale}/login`}>{t.submitLogin}</Link>
      </p>
      <Link href={`/${locale}`} className="auth-back">
        ← {dict.common.appName}
      </Link>
    </div>
  );
}
