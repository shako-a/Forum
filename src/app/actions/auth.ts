"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { SignupFormSchema, LoginFormSchema, type FormState } from "@/lib/definitions";
import { defaultLocale, isLocale } from "@/i18n/config";
import { postAuthDestination } from "@/lib/redirects";
import { sendVerificationEmail } from "@/app/actions/account-recovery";

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function nextFrom(formData: FormData): string | undefined {
  const raw = formData.get("next");
  return typeof raw === "string" ? raw : undefined;
}

export async function signup(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);

  const parsed = SignupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    forumName: formData.get("forumName"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    city: formData.get("city") || undefined,
    hideRealName: formData.get("hideRealName") === "on",
  });

  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }

  const { email, password, forumName, ...rest } = parsed.data;

  // Surface friendly errors for the unique fields before hitting the DB constraint.
  const [emailTaken, nameTaken] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.findUnique({ where: { forumName }, select: { id: true } }),
  ]);
  if (emailTaken) return { errors: { email: ["An account with this email already exists."] } };
  if (nameTaken) return { errors: { forumName: ["This forum name is taken."] } };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, forumName, passwordHash, ...rest },
    select: { id: true, role: true },
  });

  // Fire off a verification email (best-effort — a delivery hiccup must not
  // block signup, and access isn't gated on it: soft nudge only).
  if (isLocale(locale)) await sendVerificationEmail(user.id, email, locale);

  await createSession(user.id, user.role);
  redirect(postAuthDestination(nextFrom(formData), locale));
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);

  const parsed = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true, status: true },
  });

  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok || user.status !== "ACTIVE") {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id, user.role);
  redirect(postAuthDestination(nextFrom(formData), locale));
}

export async function logout(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  await deleteSession();
  redirect(`/${locale}`);
}

// Small helper: turn a ZodError into { field: messages[] } without depending on
// a specific zod minor-version flatten signature.
function z_flatten(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
