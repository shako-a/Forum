import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { locales, defaultLocale, isLocale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";
const SESSION_COOKIE = "session";

// The forum is publicly readable: guests can browse feeds, categories, threads,
// profiles and the /more pages. Only the sections below require a login — these
// are the first path segment after the locale, e.g. /ka/create -> "create".
// Everything else is open; locked/hidden content is already filtered out of the
// read queries when there's no viewer, so guests never see private sections.
//
// This proxy check is defense-in-depth: each of these pages ALSO calls
// requireUser()/requireAdminPanel() itself (that's the real gate), and every
// mutating server action re-checks auth independently. So a guest who reaches a
// gated page some other way still can't do anything.
const GATED_SECTIONS = new Set(["create", "account", "inbox", "ask", "admin"]);

// Does this path require a logged-in user? `segments` is ["", locale, sub, ...].
function requiresLogin(segments: string[]): boolean {
  const sub = segments[2] ?? "";
  if (GATED_SECTIONS.has(sub)) return true;
  // Edit screens live under otherwise-public sections (p/<slug>/edit,
  // business/<slug>/edit) — gate them by their trailing segment.
  if (segments[segments.length - 1] === "edit") return true;
  // The business section is public to read, but creating/managing a listing is not.
  if (sub === "business" && (segments[3] === "new" || segments[3] === "mine")) return true;
  return false;
}

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

    // Enforce the language preference: visitors who haven't explicitly chosen a
    // language (no NEXT_LOCALE cookie) always get the default (ka), even when
    // they land on an /en link from history/autocomplete. Explicit choices
    // (the switcher sets the cookie) are honored.
    const preferred = negotiateLocale(request);
    if (locale !== preferred) {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferred}${pathname.slice(locale.length + 1)}`;
      return NextResponse.redirect(url);
    }

    // Public by default; only the gated sections bounce guests to login.
    if (requiresLogin(segments) && !(await hasValidSession(request))) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
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
