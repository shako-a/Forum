import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, isLocale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

// Minimal Accept-Language negotiation (no extra deps): pick the first
// supported locale by quality, else fall back to the default.
function negotiateLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;

  const header = request.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, q] = part.trim().split(";q=");
        return { tag: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      if (isLocale(tag)) return tag;
    }
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Is a supported locale already present at the start of the path?
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  // Redirect e.g. /categories -> /en/categories
  const locale = negotiateLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
