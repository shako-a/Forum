import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { defaultLocale, isLocale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";
const SESSION_COOKIE = "session";

// The forum is publicly readable: guests can browse feeds, categories, threads,
// profiles and the /more pages. Only the sections below require a login — these
// are the first path segment after the locale, e.g. /ka/create -> "create".
// (Clean URLs are resolved to that internal form before this runs.)
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
  // The business, real-estate and marketplace sections are public to read, but
  // creating and managing entries (and the saved-items list) is not.
  if (
    (sub === "business" || sub === "realestate" || sub === "market" || sub === "auto" || sub === "jobs") &&
    (segments[3] === "new" || segments[3] === "mine" || segments[3] === "saved" || segments[3] === "orders")
  ) {
    return true;
  }
  return false;
}

// Next's generated share-card routes, e.g. /ka/opengraph-image. Real routes
// can carry a hashed suffix (`opengraph-image-<hash>`), so match by prefix.
function isMetadataImage(segments: string[]): boolean {
  const last = segments[segments.length - 1] ?? "";
  return last.startsWith("opengraph-image") || last.startsWith("twitter-image");
}

// A path as visitors see it: the default language carries no prefix.
function visiblePath(locale: string, rest: string): string {
  if (locale === defaultLocale) return rest || "/";
  return rest === "/" ? `/${locale}` : `/${locale}${rest}`;
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
  const first = pathname.split("/")[1] ?? "";

  const preferred = negotiateLocale(request);
  // Share-card images are assets, not pages: they're fetched by Facebook, X,
  // Slack and Telegram with no cookies, and several of those scrapers won't
  // follow a redirect on an og:image URL — the preview just comes out blank.
  // So a prefixed one is served exactly as asked; an unprefixed one still gets
  // rewritten onto the tree below, like any other path.
  const isCard = isMetadataImage(pathname.split("/"));

  if (isLocale(first)) {
    if (isCard) return NextResponse.next();
    const rest = pathname.slice(first.length + 1) || "/"; // "/business", or "/"

    // Georgian is the default language, so it has no prefix: /ka/business is
    // the old form of /business. Redirect permanently rather than serving both,
    // so there is one address per page for links, history and search engines.
    // Anything still emitting /ka/… (a plain <a>, a form action, a server
    // redirect) lands on the right page through here.
    if (first === defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = rest;
      return NextResponse.redirect(url, 308);
    }

    // Enforce the language preference: visitors who haven't explicitly chosen
    // a language always get the default, even when they land on an /en link
    // from history or autocomplete. Explicit choices (the switcher sets the
    // cookie) are honored.
    if (first !== preferred) {
      const url = request.nextUrl.clone();
      url.pathname = visiblePath(preferred, rest);
      return NextResponse.redirect(url);
    }

    if (requiresLogin(pathname.split("/")) && !(await hasValidSession(request))) {
      const url = request.nextUrl.clone();
      url.pathname = visiblePath(first, "/login");
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // No prefix. A visitor who chose another language gets sent to its prefix;
  // everyone else sees the default language at this clean URL.
  if (preferred !== defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = visiblePath(preferred, pathname);
    return NextResponse.redirect(url);
  }

  // The routes live under /[lang], so serve the default tree without showing
  // it. A rewrite, not a redirect: the address bar keeps the clean URL.
  const internal = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  if (requiresLogin(internal.split("/")) && !(await hasValidSession(request))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const url = request.nextUrl.clone();
  url.pathname = internal;
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
