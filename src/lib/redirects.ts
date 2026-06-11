import { isLocale, defaultLocale } from "@/i18n/config";

/**
 * Validate a post-auth `next` redirect target. Only same-site absolute paths are
 * allowed (must start with a single "/"), preventing open-redirect attacks via
 * protocol-relative ("//evil.com") or absolute ("https://…") URLs.
 * Returns the safe path, or undefined if invalid.
 */
export function safeNext(next: string | undefined, locale: string): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

/** Where to land after a successful login/signup. */
export function postAuthDestination(next: string | undefined, locale: string): string {
  const lang = isLocale(locale) ? locale : defaultLocale;
  return safeNext(next, lang) ?? `/${lang}`;
}
