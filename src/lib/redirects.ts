import { isLocale, defaultLocale } from "@/i18n/config";
import { localeHref, stripDefaultLocale } from "@/lib/locale-url";

/**
 * Validate a post-auth `next` redirect target. Only same-site absolute paths are
 * allowed (must start with a single "/"), preventing open-redirect attacks via
 * protocol-relative ("//evil.com") or absolute ("https://…") URLs.
 * Returns the safe path, or undefined if invalid.
 */
export function safeNext(next: string | undefined, locale: string): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  // The default language has no prefix. A `next` that still carries one (an
  // old bookmark, a redirect built before this) would work via the proxy, but
  // only after an extra hop — land on the clean URL directly.
  return stripDefaultLocale(next);
}

/** Where to land after a successful login/signup. */
export function postAuthDestination(next: string | undefined, locale: string): string {
  const lang = isLocale(locale) ? locale : defaultLocale;
  return safeNext(next, lang) ?? localeHref(`/${lang}`);
}
