"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function SignupForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const [state, action, pending] = useActionState(signup, undefined);
  const err = state?.errors;
  const field =
    "w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";

  function Field({
    name,
    label,
    type = "text",
    required = true,
    autoComplete,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
  }) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label}
        {required && <span className="sr-only">required</span>}
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          className={field}
          required={required}
        />
        {err?.[name] && <span className="text-xs text-red-600">{err[name]!.join(" ")}</span>}
      </label>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <h1 className="text-xl font-bold">{t.signupTitle}</h1>

      {state?.message && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}

      <Field name="forumName" label={t.forumName} autoComplete="username" />
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName" label={t.firstName} autoComplete="given-name" />
        <Field name="lastName" label={t.lastName} autoComplete="family-name" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hideRealName" />
        {t.hideRealName}
      </label>

      <Field name="email" label={t.email} type="email" autoComplete="email" />
      <Field name="password" label={t.password} type="password" autoComplete="new-password" />
      <Field name="phone" label={t.phone} type="tel" autoComplete="tel" />

      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label={t.city} required={false} autoComplete="address-level2" />
        <Field name="state" label={t.state} autoComplete="address-level1" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {t.submitSignup}
      </button>

      <p className="text-sm opacity-70">
        {t.haveAccount}{" "}
        <Link href={`/${locale}/login`} className="font-medium underline">
          {t.submitLogin}
        </Link>
      </p>
    </form>
  );
}
