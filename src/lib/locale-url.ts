import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

// Georgian is the site's default language, so it carries no URL prefix:
// geoglobally.com/business is the Georgian page, /en/business the English one.
//
// Internally every route still lives under /[lang], and pages still build
// hrefs as `/${lang}/…`. These helpers are the single translation layer
// between the two: components/Link.tsx applies localeHref to everything it
// renders, and src/proxy.ts rewrites the clean URL back onto the /ka tree.
//
// Links that slip through unconverted (a plain <a>, a form action, a server
// redirect) still work — the proxy answers /ka/x with a permanent redirect to
// /x — they just cost one extra hop.

const DEFAULT_PREFIX = `/${defaultLocale}`;

/** Drop a leading default-locale segment. `/ka/business` → `/business`. */
export function stripDefaultLocale(path: string): string {
  if (!path.startsWith(DEFAULT_PREFIX)) return path;
  const rest = path.slice(DEFAULT_PREFIX.length);
  // Only strip a whole segment: `/ka` and `/ka/…` yes, `/kanban` no.
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?") || rest.startsWith("#")) return `/${rest}`;
  return path;
}

/**
 * The public URL for an internal path.
 *
 * Also cleans a `next` query parameter, because that is itself an internal
 * URL: without it a login link reads /login?next=/ka/ask and the visitor is
 * bounced through /ka/ask after signing in.
 */
export function localeHref(href: string): string {
  if (!href.startsWith("/")) return href; // external, hash-only, or relative

  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const query = queryAt >= 0 ? beforeHash.slice(queryAt + 1) : "";

  let out = stripDefaultLocale(path);
  if (query) {
    // Only re-serialize when there is something to fix, so every other query
    // string is passed through with its original encoding.
    if (query.includes("next=")) {
      const params = new URLSearchParams(query);
      const next = params.get("next");
      if (next && next.startsWith("/")) params.set("next", stripDefaultLocale(next));
      out += `?${params.toString()}`;
    } else {
      out += `?${query}`;
    }
  }
  return out + hash;
}

/** Split a *visible* path into its locale and the rest. `/en/x` → en + `/x`. */
export function splitLocale(pathname: string): { locale: Locale; rest: string } {
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) {
    return { locale: first, rest: pathname.slice(first.length + 1) || "/" };
  }
  return { locale: defaultLocale, rest: pathname || "/" };
}

/** The same page in another language, as a visible URL. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const { rest } = splitLocale(pathname);
  if (next === defaultLocale) return rest || "/";
  return rest === "/" ? `/${next}` : `/${next}${rest}`;
}

/** Every locale prefix that can appear at the start of a visible path. */
export const LOCALE_PREFIXES = locales.map((l) => `/${l}`);
