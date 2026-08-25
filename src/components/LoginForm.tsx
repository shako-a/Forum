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
  justReset = false,
}: {
  locale: Locale;
  dict: Dictionary;
  next?: string;
  /** Arrived here right after a successful password reset. */
  justReset?: boolean;
}) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="auth-card">
      <AuthBrand locale={locale} appName={dict.common.appName} />
      <h1 className="auth-title">{t.loginTitle}</h1>
      <p className="auth-sub">{dict.common.tagline}</p>

      {justReset && (
        <p className="auth-ok" role="status">
          {t.resetDone}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}

        {state?.code === "lockedOut" ? (
          <div className="auth-alert" role="alert">
            <p>{t.lockedOut.replace("{m}", String(state.lockMinutes ?? 15))}</p>
            <p className="auth-alert-help">
              <Link href={`/${locale}/forgot`}>{t.lockedOutReset}</Link>
            </p>
          </div>
        ) : state?.code === "attemptsLeft" ? (
          <p className="auth-alert" role="alert">
            {t.attemptsLeft
              .replace("{n}", String(state.attemptsLeft ?? 0))
              .replace("{m}", String(state.lockMinutes ?? 15))}
          </p>
        ) : state?.message ? (
          <p className="auth-alert" role="alert">
            {state.message}
          </p>
        ) : null}

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
        <Link href={`/${locale}/forgot`}>{t.forgotLink}</Link>
      </p>

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
