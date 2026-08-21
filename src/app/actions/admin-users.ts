"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import {
  AdminCreateUserSchema,
  ProfileFormSchema,
  SetPasswordSchema,
  zodErrors,
  type FormState,
} from "@/lib/definitions";
import { syncSubscription } from "@/lib/subscriptions";
import type { Role, UserStatus } from "@/generated/prisma/client";

// Admin sets a new password for a user (no email flow). The admin shares the
// new password with the user out-of-band.
export async function setUserPassword(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await authorize("ADMIN");
  if (!actor) return { message: "You do not have permission to do this." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { message: "Missing user." };

  const parsed = SetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return { message: "User not found." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}

// User management — admin only. Admins cannot change their own role or status,
// so an admin can never accidentally lock themselves out of the panel.

const ROLES: Role[] = ["USER", "MODERATOR", "ADMIN"];
const STATUSES: UserStatus[] = ["ACTIVE", "ARCHIVED"];

// Admin creates an account directly (e.g. for a team member), bypassing the
// mandatory profile fields the public sign-up form collects. Only email, forum
// name and password are required; the rest are stored blank and can be filled
// in later. The account is created already email-verified (no nudge banner) and
// ACTIVE, so the person can log in immediately with the shared credentials.
export async function adminCreateUser(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await authorize("ADMIN");
  if (!actor) return { message: "You do not have permission to do this." };

  const parsed = AdminCreateUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    forumName: formData.get("forumName"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { email, password, forumName } = parsed.data;
  const roleRaw = String(formData.get("role") ?? "USER");
  const role: Role = ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : "USER";

  // Friendly errors for the unique fields before hitting the DB constraint.
  const [emailTaken, nameTaken] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.findUnique({ where: { forumName }, select: { id: true } }),
  ]);
  if (emailTaken) return { errors: { email: ["An account with this email already exists."] } };
  if (nameTaken) return { errors: { forumName: ["This forum name is taken."] } };

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      email,
      forumName,
      passwordHash,
      role,
      emailVerified: true, // admin-created — skip the verify nudge
      // Bypassed profile fields: required in the DB, left blank for the user.
      firstName: "",
      lastName: "",
      phone: "",
      state: "",
    },
    select: { id: true },
  });

  revalidatePath("/[lang]/admin/users", "page");
  return { ok: true, message: "User created." };
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor || actor.id === userId) return;
  if (!ROLES.includes(role)) return;

  // Dropping to USER means they can no longer moderate, so clear stale
  // category assignments to keep moderator data consistent.
  if (role === "USER") {
    await db.user.update({
      where: { id: userId },
      data: { role, moderatedCategories: { set: [] } },
    });
  } else {
    await db.user.update({ where: { id: userId }, data: { role } });
  }

  revalidatePath("/[lang]/admin/users", "page");
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor || actor.id === userId) return;
  if (!STATUSES.includes(status)) return;

  await db.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/[lang]/admin/users", "page");
}

// Grant/revoke the paid "Donor" tier. Self is allowed (no lockout risk), so an
// admin can grant themselves Donor. Stripe will drive this automatically later.
export async function setUserDonor(userId: string, isDonor: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;

  await db.user.update({ where: { id: userId }, data: { isDonor } });
  await syncSubscription(userId, "DONOR", isDonor);
  revalidatePath("/[lang]/admin/users", "page");
}

// Grant/revoke the paid "Professional" tier. Stripe will drive this later.
export async function setUserPro(userId: string, isPro: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;

  await db.user.update({ where: { id: userId }, data: { isPro } });
  await syncSubscription(userId, "PRO", isPro);
  revalidatePath("/[lang]/admin/users", "page");
}

// Grant/revoke the entry-level "Supporter" tier. Stripe will drive this later.
export async function setUserSupporter(userId: string, isSupporter: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;

  await db.user.update({ where: { id: userId }, data: { isSupporter } });
  await syncSubscription(userId, "SUPPORTER", isSupporter);
  revalidatePath("/[lang]/admin/users", "page");
}

// Grant/revoke a moderator's access to the (moderation-only) admin panel. Only
// meaningful for moderators — admins always have access, plain users never do.
export async function setUserAdminAccess(userId: string, canAccessAdmin: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;

  await db.user.update({ where: { id: userId }, data: { canAccessAdmin } });
  revalidatePath("/[lang]/admin/users", "page");
}

// Admin edits another user's profile fields (name, contact, location, hidden
// name). Role/status/donor/admin-access stay on their dedicated toggles.
export async function adminUpdateUser(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await authorize("ADMIN");
  if (!actor) return { message: "You do not have permission to do this." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { message: "Missing user." };

  const parsed = ProfileFormSchema.safeParse({
    email: formData.get("email"),
    forumName: formData.get("forumName"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    city: formData.get("city") || undefined,
    hideRealName: formData.get("hideRealName") === "on",
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { email, forumName, city, ...rest } = parsed.data;
  const isDonor = formData.get("isDonor") === "on"; // tier toggle, edited inline here
  const isPro = formData.get("isPro") === "on"; // tier toggle, edited inline here
  const isSupporter = formData.get("isSupporter") === "on"; // tier toggle, edited inline here
  const canRevealAnon = formData.get("canRevealAnon") === "on"; // per-staff reveal grant
  const labelIds = formData.getAll("labelIds").map(String); // custom labels assigned to this user

  // Unique fields — ignore the row being edited.
  const [emailOwner, nameOwner] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.findUnique({ where: { forumName }, select: { id: true } }),
  ]);
  if (emailOwner && emailOwner.id !== userId)
    return { errors: { email: ["An account with this email already exists."] } };
  if (nameOwner && nameOwner.id !== userId)
    return { errors: { forumName: ["This forum name is taken."] } };

  await db.user.update({
    where: { id: userId },
    data: {
      email,
      forumName,
      city: city ?? null,
      isDonor,
      isPro,
      isSupporter,
      canRevealAnon,
      ...rest,
      labels: { set: labelIds.map((id) => ({ id })) }, // replace assignments
    },
  });

  // Keep the subscription ledger in sync with the tier toggles.
  await syncSubscription(userId, "DONOR", isDonor);
  await syncSubscription(userId, "PRO", isPro);
  await syncSubscription(userId, "SUPPORTER", isSupporter);

  revalidatePath("/[lang]/admin/users", "page");
  revalidatePath("/[lang]/admin/users/[id]", "page");
  return { ok: true, message: "Saved." };
}
