import type { Role } from "@/generated/prisma/client";
import { DEFAULT_PREFS, type AppearancePrefs } from "@/lib/appearance";

// The slice of the current user the Header (and the components it feeds) need.
export type HeaderUser = {
  forumName: string;
  isDonor: boolean;
  isPro: boolean;
  isSupporter: boolean;
  // Perks from admin-created packages. Without these the header would show
  // "Ask AI" as locked for someone who genuinely has access through a package,
  // disagreeing with the page itself.
  featureKeys: string[];
  /** Appearance preferences, emitted as token overrides by <UserTheme>. */
  prefs: AppearancePrefs;
  role: Role;
  canAccessAdmin: boolean;
} | null;

// Build it from a loaded user (getCurrentUser result) or null for guests.
export function toHeaderUser(
  user: {
    forumName: string;
    isDonor: boolean;
    isPro: boolean;
    isSupporter: boolean;
    featureKeys?: string[];
    themePalette?: string;
    themeAccent?: string | null;
    themeDensity?: string;
    themeRadius?: string;
    themeDepth?: string;
    role: Role;
    canAccessAdmin: boolean;
  } | null,
): HeaderUser {
  return user
    ? {
        forumName: user.forumName,
        isDonor: user.isDonor,
        isPro: user.isPro,
        isSupporter: user.isSupporter,
        featureKeys: user.featureKeys ?? [],
        prefs: {
          themePalette: user.themePalette ?? DEFAULT_PREFS.themePalette,
          themeAccent: user.themeAccent ?? null,
          themeDensity: user.themeDensity ?? DEFAULT_PREFS.themeDensity,
          themeRadius: user.themeRadius ?? DEFAULT_PREFS.themeRadius,
          themeDepth: user.themeDepth ?? DEFAULT_PREFS.themeDepth,
        },
        role: user.role,
        canAccessAdmin: user.canAccessAdmin,
      }
    : null;
}
