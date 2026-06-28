import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { locales, defaultLocale, isLocale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";
const SESSION_COOKIE = "session";

// Pages reachable without logging in (everything else is gated). These are the
// first path segment after the locale, e.g. /ka/login -> "login".
const PUBLIC_SUBPATHS = new Set(["login", "signup"]);

// Honor the visitor's saved choice (NEXT_LOCALE cookie); otherwise default to
// Georgian. We intentionally don't sniff Accept-Language — this is a Georgian
// community, so new visitors start in ka and can switch (the choice sticks).
function negotiateLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return defaultLocale;
}

// Edge-safe session check: verify the JWT cookie (same alg/secret as the app).
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Is a supported locale already present at the start of the path?
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    const segments = pathname.split("/"); // ["", locale, sub, ...]
    const locale = segments[1];
    const sub = segments[2] ?? "";

    // Auth pages stay public; the whole forum is otherwise behind login.
    if (PUBLIC_SUBPATHS.has(sub)) return NextResponse.next();
    if (await hasValidSession(request)) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Redirect e.g. /categories -> /ka/categories (the locale'd path then runs
  // through this middleware again, where the auth gate applies).
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
