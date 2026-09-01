"use client";

import Link from "@/components/Link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/account-recovery";
import { AuthBrand } from "@/components/AuthBrand";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ForgotForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="auth-card">
      <AuthBrand locale={locale} appName={dict.common.appName} />
      <h1 className="auth-title">{t.forgotTitle}</h1>
      <p className="auth-sub">{t.forgotSub}</p>

      {/* Always-generic success: never reveals whether the email has an account. */}
      {state?.ok ? (
        <p className="auth-ok" role="status">
          {t.forgotSent}
        </p>
      ) : (
        <form action={action}>
          <input type="hidden" name="locale" value={locale} />
          <div className="field">
            <label htmlFor="email">
              {t.email}
              <span className="req">*</span>
            </label>
            <input id="email" name="email" type="email" autoComplete="email" className="input" required />
            {state?.errors?.email && <p className="field-error">{state.errors.email[0]}</p>}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary btn-full">
            {t.forgotSubmit}
          </button>
        </form>
      )}

      <p className="auth-foot">
        <Link href={`/${locale}/login`}>← {t.backToLogin}</Link>
      </p>
    </div>
  );
}
