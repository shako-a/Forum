"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import type { Role, UserStatus } from "@/generated/prisma/client";

// User management — admin only. Admins cannot change their own role or status,
// so an admin can never accidentally lock themselves out of the panel.

const ROLES: Role[] = ["USER", "MODERATOR", "ADMIN"];
const STATUSES: UserStatus[] = ["ACTIVE", "ARCHIVED"];

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
