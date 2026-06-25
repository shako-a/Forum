import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Role } from "@/generated/prisma/client";

// Role hierarchy for "at least this role" checks.
const RANK: Record<Role, number> = { USER: 1, MODERATOR: 2, ADMIN: 3 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/**
 * Optimistic auth check from the signed cookie (no DB hit). Memoized per request.
 * Returns null for guests rather than redirecting, so callers decide what to do.
 */
export const getAuth = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return { userId: session.userId, role: session.role };
});

/**
 * Secure check: loads the current user from the DB (also catches archived/deleted
 * accounts whose cookie is still valid). Memoized per request. Returns null for guests.
 */
export const getCurrentUser = cache(async () => {
  const auth = await getAuth();
  if (!auth) return null;

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      forumName: true,
      firstName: true,
      lastName: true,
      hideRealName: true,
      city: true,
      state: true,
      role: true,
      status: true,
      isDonor: true,
      isPro: true,
      canAccessAdmin: true,
      isOwner: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

/**
 * Who may open the admin panel: admins always; a moderator only if granted
 * per-moderator admin access; everyone else never. (Moderators get a
 * moderation-only view — section-level gating lives in the admin routes.)
 */
export function canAccessAdminPanel(user: { role: Role; canAccessAdmin: boolean }): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "MODERATOR" && user.canAccessAdmin;
}

/** Require an authenticated, active user. Redirects guests to login. */
export async function requireUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

/** Require at least the given role. Redirects unauthorized users home. */
export async function requireRole(locale: string, min: Role) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (!roleAtLeast(user.role, min)) redirect(`/${locale}`);
  return user;
}

/** Require admin-panel access (admin, or moderator with the per-mod grant). */
export async function requireAdminPanel(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (!canAccessAdminPanel(user)) redirect(`/${locale}`);
  return user;
}

/**
 * Server-side guard for mutating Server Actions (which are reachable via direct
 * POST, not just the UI). Returns the active user if they hold at least `min`,
 * otherwise null — the caller decides how to bail (return error / no-op).
 */
export async function authorize(min: Role) {
  const user = await getCurrentUser();
  if (!user || !roleAtLeast(user.role, min)) return null;
  return user;
}

/**
 * Category-scoped moderation check (spec: moderators are assigned categories).
 * Admins can moderate everywhere; a MODERATOR only in categories they're
 * assigned to via `Category.moderators`; everyone else never. Memoized per
 * request keyed by user + category.
 */
export async function canModerateCategory(
  user: { id: string; role: Role },
  categoryId: string,
): Promise<boolean> {
  if (roleAtLeast(user.role, "ADMIN")) return true;
  if (user.role !== "MODERATOR") return false;
  const assigned = await db.category.findFirst({
    where: { id: categoryId, moderators: { some: { id: user.id } } },
    select: { id: true },
  });
  return !!assigned;
}

/** Global site settings (single row). Memoized per request; safe defaults. */
export const getSiteSettings = cache(async () => {
  try {
    const row = await db.siteSetting.findUnique({ where: { id: "singleton" } });
    return { revealAnonymousToStaff: row?.revealAnonymousToStaff ?? false };
  } catch {
    return { revealAnonymousToStaff: false };
  }
});

/**
 * Whether a viewer may see the real author behind anonymous content: the owner
 * always; other admins/moderators only when the owner has enabled it.
 */
export async function canRevealAnonymous(
  viewer: { role: Role; isOwner: boolean } | null,
): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.isOwner) return true;
  if (viewer.role === "ADMIN" || viewer.role === "MODERATOR") {
    return (await getSiteSettings()).revealAnonymousToStaff;
  }
  return false;
}

/** The set of category ids a user moderates (empty for non-moderators / admins handled by caller). */
export async function getModeratedCategoryIds(userId: string): Promise<string[]> {
  const cats = await db.category.findMany({
    where: { moderators: { some: { id: userId } } },
    select: { id: true },
  });
  return cats.map((c) => c.id);
}
