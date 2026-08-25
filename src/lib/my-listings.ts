import { db } from "@/lib/db";
import { isMarketExpired, canRenew } from "@/lib/market";

// Everything one member has listed, across the four areas, normalized into a
// single row shape so the account dashboard can show them in one table.
//
// Each area has its own status vocabulary (active flags, SOLD/PAUSED/REMOVED,
// marketplace expiry). They collapse into the five states below so a member
// can scan the whole lot without learning four different schemes.

export type MyListingKind = "estate" | "auto" | "market" | "job";

// LIVE      — publicly visible right now
// PAUSED    — hidden by the owner, restorable
// EXPIRED   — aged out of search (marketplace); one click brings it back
// CLOSED    — sold, rented out or filled
// REMOVED   — taken down by staff; the owner can't restore it
export type MyListingStatus = "LIVE" | "PAUSED" | "EXPIRED" | "CLOSED" | "REMOVED";

export type MyListingRow = {
  id: string;
  kind: MyListingKind;
  title: string;
  href: string;
  editHref: string;
  thumb: string | null;
  status: MyListingStatus;
  /** Free-text status detail, e.g. the staff reason for a removal. */
  note: string | null;
  priceCents: number | null; // whole dollars actually; null when not priced
  priceSuffix: string | null; // "/mo", "/day" …
  meta: string; // location / category line
  views: number | null;
  saves: number | null;
  canRenew: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MyListingsBuckets = Record<MyListingKind, MyListingRow[]>;

function loc(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(", ");
}

export async function getMyListings(userId: string, locale: string): Promise<MyListingsBuckets> {
  // Jobs the member posted themselves, plus jobs belonging to businesses they
  // own or help manage — from their point of view both are "my listings".
  const managed = await db.business.findMany({
    where: { OR: [{ ownerId: userId }, { managers: { some: { userId } } }] },
    select: { id: true, name: true, slug: true },
  });
  const managedIds = managed.map((b) => b.id);

  const [estate, auto, market, jobs] = await Promise.all([
    db.propertyListing.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, slug: true, title: true, price: true, kind: true, active: true,
        photos: true, city: true, state: true, views: true, createdAt: true, updatedAt: true,
      },
    }),
    db.autoListing.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, slug: true, title: true, price: true, kind: true, status: true, removedReason: true,
        photos: true, city: true, state: true, views: true, createdAt: true, updatedAt: true,
      },
    }),
    db.marketListing.findMany({
      where: { sellerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, slug: true, title: true, price: true, priceType: true, status: true, removedReason: true,
        photos: true, city: true, state: true, views: true, bumpedAt: true, createdAt: true, updatedAt: true,
        _count: { select: { favorites: true } },
      },
    }),
    db.jobPosting.findMany({
      where: { OR: [{ posterId: userId }, ...(managedIds.length ? [{ businessId: { in: managedIds } }] : [])] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, companyName: true, active: true, city: true, state: true,
        businessId: true, posterId: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);

  return {
    estate: estate.map((l) => ({
      id: l.id,
      kind: "estate" as const,
      title: l.title,
      href: `/${locale}/realestate/${l.slug}`,
      editHref: `/${locale}/realestate/${l.slug}/edit`,
      thumb: l.photos[0] ?? null,
      status: l.active ? "LIVE" : "PAUSED",
      note: null,
      priceCents: l.price,
      priceSuffix: l.kind === "RENT" ? "/mo" : null,
      meta: loc(l.city, l.state),
      views: l.views,
      saves: null,
      canRenew: false,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
    auto: auto.map((l) => ({
      id: l.id,
      kind: "auto" as const,
      title: l.title,
      href: `/${locale}/auto/${l.slug}`,
      editHref: `/${locale}/auto/${l.slug}/edit`,
      thumb: l.photos[0] ?? null,
      status: (l.status === "ACTIVE" ? "LIVE" : l.status === "SOLD" ? "CLOSED" : l.status) as MyListingStatus,
      note: l.removedReason,
      priceCents: l.price,
      priceSuffix: l.kind === "RENT" ? "/day" : null,
      meta: loc(l.city, l.state),
      views: l.views,
      saves: null,
      canRenew: false,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
    market: market.map((l) => {
      const expired = l.status === "ACTIVE" && isMarketExpired(l.bumpedAt);
      return {
        id: l.id,
        kind: "market" as const,
        title: l.title,
        href: `/${locale}/market/${l.slug}`,
        editHref: `/${locale}/market/${l.slug}/edit`,
        thumb: l.photos[0] ?? null,
        status: (expired
          ? "EXPIRED"
          : l.status === "ACTIVE"
            ? "LIVE"
            : l.status === "SOLD"
              ? "CLOSED"
              : l.status) as MyListingStatus,
        note: l.removedReason,
        priceCents: l.priceType === "FREE" ? 0 : l.price,
        priceSuffix: null,
        meta: loc(l.city, l.state),
        views: l.views,
        saves: l._count.favorites,
        canRenew: l.status === "ACTIVE" && canRenew(l.bumpedAt),
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      };
    }),
    job: jobs.map((j) => {
      const biz = managed.find((b) => b.id === j.businessId);
      return {
        id: j.id,
        kind: "job" as const,
        title: j.title,
        href: `/${locale}/jobs`,
        // Business jobs are managed on the business's own jobs page.
        editHref: biz ? `/${locale}/business/${biz.slug}/jobs` : `/${locale}/jobs/${j.id}/edit`,
        thumb: null,
        status: j.active ? "LIVE" : "PAUSED",
        note: biz ? `🏢 ${biz.name}` : (j.companyName ?? null),
        priceCents: null,
        priceSuffix: null,
        meta: loc(j.city, j.state),
        views: null,
        saves: null,
        canRenew: false,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      };
    }),
  };
}

/** Counts for the summary tiles. */
export function summarize(b: MyListingsBuckets) {
  const all = [...b.estate, ...b.auto, ...b.market, ...b.job];
  return {
    total: all.length,
    live: all.filter((r) => r.status === "LIVE").length,
    attention: all.filter((r) => r.status === "EXPIRED" || r.status === "REMOVED").length,
    paused: all.filter((r) => r.status === "PAUSED").length,
    closed: all.filter((r) => r.status === "CLOSED").length,
    views: all.reduce((s, r) => s + (r.views ?? 0), 0),
  };
}
