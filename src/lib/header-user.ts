import type { Role } from "@/generated/prisma/client";

// The slice of the current user the Header (and the components it feeds) need.
export type HeaderUser = {
  forumName: string;
  isDonor: boolean;
  isPro: boolean;
  role: Role;
  canAccessAdmin: boolean;
} | null;

// Build it from a loaded user (getCurrentUser result) or null for guests.
export function toHeaderUser(
  user: { forumName: string; isDonor: boolean; isPro: boolean; role: Role; canAccessAdmin: boolean } | null,
): HeaderUser {
  return user
    ? {
        forumName: user.forumName,
        isDonor: user.isDonor,
        isPro: user.isPro,
        role: user.role,
        canAccessAdmin: user.canAccessAdmin,
      }
    : null;
}
