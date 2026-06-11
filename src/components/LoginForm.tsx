"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { AuthBrand } from "@/components/AuthBrand";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function LoginForm({
  locale,
  dict,
  next,
}: {
  locale: Locale;
  dict: Dictionary;
  next?: string;
}) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="auth-card">
      <AuthBrand locale={locale} appName={dict.common.appName} />
      <h1 className="auth-title">{t.loginTitle}</h1>
      <p className="auth-sub">{dict.common.tagline}</p>

      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}

        {state?.message && (
          <p className="auth-alert" role="alert">
            {state.message}
          </p>
        )}

        <div className="field">
          <label htmlFor="email">
            {t.email}
            <span className="req">*</span>
          </label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" required />
        </div>

        <div className="field">
          <label htmlFor="password">
            {t.password}
            <span className="req">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input"
            required
          />
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary btn-full">
          {t.submitLogin}
        </button>
      </form>

      <p className="auth-foot">
        {t.noAccount}{" "}
        <Link href={`/${locale}/signup`}>{t.submitSignup}</Link>
      </p>
      <Link href={`/${locale}`} className="auth-back">
        ← {dict.common.appName}
      </Link>
    </div>
  );
}
