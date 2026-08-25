"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { SignupFormSchema, LoginFormSchema, type FormState } from "@/lib/definitions";
import { defaultLocale, isLocale } from "@/i18n/config";
import { postAuthDestination } from "@/lib/redirects";
import { sendVerificationEmail } from "@/app/actions/account-recovery";
import { flagGaEvent } from "@/lib/ga-server";

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
  await flagGaEvent("sign_up"); // fires on the page the redirect lands on
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
    select: {
      id: true,
      role: true,
      passwordHash: true,
      status: true,
      failedLogins: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    // Burn the same bcrypt time as a real check so response timing doesn't
    // reveal whether the email is registered.
    await bcrypt.compare(parsed.data.password, DUMMY_HASH);
    return { message: "Invalid email or password." };
  }

  const now = Date.now();
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    const lockMinutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now) / 60_000));
    return {
      code: "lockedOut",
      lockMinutes,
      message: `Too many incorrect attempts. Try again in ${lockMinutes} min, or reset your password.`,
    };
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    if (failed >= LOCK_AFTER_ATTEMPTS) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: new Date(now + LOCK_MINUTES * 60_000) },
      });
      return {
        code: "lockedOut",
        lockMinutes: LOCK_MINUTES,
        message: `Too many incorrect attempts. Try again in ${LOCK_MINUTES} min, or reset your password.`,
      };
    }
    await db.user.update({ where: { id: user.id }, data: { failedLogins: failed } });
    if (failed >= WARN_AFTER_ATTEMPTS) {
      const attemptsLeft = LOCK_AFTER_ATTEMPTS - failed;
      return {
        code: "attemptsLeft",
        attemptsLeft,
        lockMinutes: LOCK_MINUTES,
        message: `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left before a ${LOCK_MINUTES}-minute lock.`,
      };
    }
    return { message: "Invalid email or password." };
  }

  if (user.status !== "ACTIVE") return { message: "Invalid email or password." };

  if (user.failedLogins > 0 || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  await createSession(user.id, user.role);
  redirect(postAuthDestination(nextFrom(formData), locale));
}

// Lockout policy: warn from the 3rd wrong password, lock the account for 15
// minutes on the 5th. Counters live on the User row (see schema).
const WARN_AFTER_ATTEMPTS = 3;
const LOCK_AFTER_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// A valid bcrypt hash of a random string; only used to equalize timing.
const DUMMY_HASH = "$2b$10$4C1mFEej4Akm8XCXsEz2qOIQ4k/fEgywIkRCgxTbEFzuMw7j.3V/m";

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
