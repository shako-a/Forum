"use client";

import Link from "@/components/Link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions/account-recovery";
import { AuthBrand } from "@/components/AuthBrand";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ResetForm({ locale, dict, token }: { locale: Locale; dict: Dictionary; token: string }) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(resetPassword, undefined);
  // On success the action redirects to /login, so we only render the form or a
  // "link no longer valid" state here.
  const invalid = state?.message === "invalid";

  return (
    <div className="auth-card">
      <AuthBrand locale={locale} appName={dict.common.appName} />
      <h1 className="auth-title">{t.resetTitle}</h1>
      <p className="auth-sub">{t.resetSub}</p>

      {invalid ? (
        <>
          <p className="auth-alert" role="alert">
            {t.resetInvalid}
          </p>
          <Link href={`/${locale}/forgot`} className="btn btn-primary btn-full">
            {t.resetRequestNew}
          </Link>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="password">
              {t.newPassword}
              <span className="req">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="input"
              required
            />
            <p className="field-hint">{t.passwordHint}</p>
            {state?.errors?.password && <p className="field-error">{state.errors.password[0]}</p>}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary btn-full">
            {t.resetSubmit}
          </button>
        </form>
      )}

      <p className="auth-foot">
        <Link href={`/${locale}/login`}>← {t.backToLogin}</Link>
      </p>
    </div>
  );
}
