"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function LoginForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(login, undefined);
  const field =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <h1 className="text-xl font-bold">{t.loginTitle}</h1>

      {state?.message && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t.email}
        <input name="email" type="email" autoComplete="email" className={field} required />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className={field}
          required
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {t.submitLogin}
      </button>

      <p className="text-sm opacity-70">
        {t.noAccount}{" "}
        <Link href={`/${locale}/signup`} className="font-medium underline">
          {t.submitSignup}
        </Link>
      </p>
    </form>
  );
}
