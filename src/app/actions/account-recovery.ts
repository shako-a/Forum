"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { issueToken, consumeToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { RequestResetSchema, ResetPasswordSchema, type FormState } from "@/lib/definitions";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

function localeFrom(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// Absolute origin for links inside emails. Prefer an explicit APP_URL (set it in
// production so links always point at the real domain); otherwise derive it from
// the request, which is correct in dev and for previews.
async function origin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// --- password reset --------------------------------------------------------

// Step 1: user enters their email. We ALWAYS return the same success message,
// whether or not the address exists, so this can't be used to discover which
// emails have accounts.
export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const parsed = RequestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: { email: parsed.error.issues.map((i) => i.message) } };

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, status: true },
  });

  if (user && user.status === "ACTIVE") {
    const raw = await issueToken(user.id, "PASSWORD_RESET"); // null if throttled
    if (raw) {
      const url = `${await origin()}/${locale}/reset?token=${raw}`;
      const { subject, html } = passwordResetEmail(locale, url);
      await sendEmail({ to: parsed.data.email, subject, html });
    }
  }

  // Generic success regardless — never reveal account existence.
  return { ok: true };
}

// Step 2: user follows the link and sets a new password.
export async function resetPassword(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const out: Record<string, string[]> = {};
    for (const i of parsed.error.issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
    return { errors: out };
  }

  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return { message: "invalid" }; // expired or already used

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // Resetting via an emailed link also proves control of the address, so treat
  // the email as verified from here on.
  await db.user.update({ where: { id: userId }, data: { passwordHash, emailVerified: true } });

  redirect(`/${locale}/login?reset=1`);
}

// --- email verification ----------------------------------------------------

// Send (or resend) the verification email for a given user. Best-effort: never
// throws, so it can be called from signup without risking the signup itself.
export async function sendVerificationEmail(
  userId: string,
  email: string,
  locale: Locale,
): Promise<void> {
  try {
    const raw = await issueToken(userId, "EMAIL_VERIFY");
    if (!raw) return; // throttled — a recent link is still valid
    const url = `${await origin()}/${locale}/verify?token=${raw}`;
    const { subject, html } = verificationEmail(locale, url);
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.error("[verify] send failed:", err);
  }
}

// Logged-in user asks for a fresh verification link.
export async function resendVerification(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const user = await getCurrentUser();
  if (user && !user.emailVerified) {
    await sendVerificationEmail(user.id, user.email, locale);
  }
  redirect(`/${locale}/verify?sent=1`);
}
