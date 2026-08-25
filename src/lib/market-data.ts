import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { marketExpiryCutoff, type MarketSort } from "@/lib/market";
import { lookupZip, boundingBox, distanceMiles, type LatLng } from "@/lib/geo";

export const MARKET_PAGE_SIZE = 24;
export const MARKET_PAGE_SIZES = [24, 48, 96] as const;

export type MarketFilters = {
  q?: string;
  category?: string;
  condition?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  shipping?: boolean;
  sort?: MarketSort;
  zip?: string; // ZIP + radius: only listings that saved a ZIP can match
  radius?: number; // miles
};

// Fields the directory cards need.
const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  condition: true,
  price: true,
  priceType: true,
  photos: true,
  city: true,
  state: true,
  canShip: true,
  lat: true,
  lng: true,
  status: true,
  bumpedAt: true,
  createdAt: true,
  sellerBusiness: { select: { name: true, slug: true } },
} satisfies Prisma.MarketListingSelect;

export type MarketCardRow = Prisma.MarketListingGetPayload<{ select: typeof CARD_SELECT }> & {
  saved?: boolean;
  distance?: number; // miles from the searched ZIP, when a radius search is on
};

/**
 * Resolve a ZIP + radius filter into a centre point and the bounding box the
 * SQL query can use. Returns null when there is no usable radius search.
 */
function radiusOf(f: MarketFilters): { center: LatLng; miles: number } | null {
  if (!f.zip || !f.radius) return null;
  const center = lookupZip(f.zip);
  return center ? { center, miles: f.radius } : null;
}

// Cap on rows pulled for in-memory distance filtering. Well above any
// plausible result set for this forum; see the note in getMarketDirectory.
const RADIUS_SCAN_LIMIT = 1000;

// Everything the public search can see: active and renewed within the window.
function liveWhere(): Prisma.MarketListingWhereInput {
  return { status: "ACTIVE", bumpedAt: { gte: marketExpiryCutoff() } };
}

function filtersWhere(f: MarketFilters, includeCategory = true): Prisma.MarketListingWhereInput {
  const { q, category, condition, state, minPrice, maxPrice, freeOnly, shipping } = f;
  const r = radiusOf(f);
  const radius = r ? { box: boundingBox(r.center, r.miles) } : null;
  return {
    ...liveWhere(),
    ...(includeCategory && category ? { category } : {}),
    ...(condition ? { condition } : {}),
    ...(state ? { state } : {}),
    ...(shipping ? { canShip: true } : {}),
    ...(radius
      ? {
          lat: { gte: radius.box.minLat, lte: radius.box.maxLat },
          lng: { gte: radius.box.minLng, lte: radius.box.maxLng },
        }
      : {}),
    ...(freeOnly ? { priceType: "FREE" } : {}),
    ...(minPrice || maxPrice
      ? { price: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

function orderFor(sort: MarketSort | undefined): Prisma.MarketListingOrderByWithRelationInput[] {
  switch (sort) {
    case "priceAsc":
      return [{ price: "asc" }, { bumpedAt: "desc" }];
    case "priceDesc":
      return [{ price: "desc" }, { bumpedAt: "desc" }];
    default:
      return [{ bumpedAt: "desc" }];
  }
}

export async function getMarketDirectory(filters: MarketFilters, page = 1, pageSize = MARKET_PAGE_SIZE) {
  const where = filtersWhere(filters);
  const radius = radiusOf(filters);

  // Radius search: the SQL box is a square around the circle, so the exact
  // distance test has to happen here. Paginating in memory keeps the count
  // honest — at this scale the box never returns more than a few hundred rows.
  if (radius) {
    const rows = await db.marketListing.findMany({
      where,
      orderBy: orderFor(filters.sort),
      take: RADIUS_SCAN_LIMIT,
      select: CARD_SELECT,
    });
    const within = rows
      .flatMap((r) =>
        r.lat == null || r.lng == null
          ? []
          : [{ ...r, distance: distanceMiles(radius.center, { lat: r.lat, lng: r.lng }) }],
      )
      .filter((r) => r.distance <= radius.miles);
    if (filters.sort === "nearest" || !filters.sort) within.sort((a, b) => a.distance - b.distance);
    const total = within.length;
    return {
      items: within.slice((page - 1) * pageSize, page * pageSize),
      total,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  const [total, items] = await Promise.all([
    db.marketListing.count({ where }),
    db.marketListing.findMany({
      where,
      orderBy: orderFor(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CARD_SELECT,
    }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Live-listing counts per category, honoring every filter except the category
// itself (so the chip strip shows what's behind each choice).
export async function getMarketCategoryCounts(filters: MarketFilters): Promise<Record<string, number>> {
  const where = filtersWhere(filters, false);
  const radius = radiusOf(filters);
  if (radius) {
    // Same exact-distance pass as the directory, so the chip counts match
    // what clicking the chip actually returns.
    const rows = await db.marketListing.findMany({
      where,
      take: RADIUS_SCAN_LIMIT,
      select: { category: true, lat: true, lng: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) {
      if (r.lat == null || r.lng == null) continue;
      if (distanceMiles(radius.center, { lat: r.lat, lng: r.lng }) > radius.miles) continue;
      out[r.category] = (out[r.category] ?? 0) + 1;
    }
    return out;
  }
  const rows = await db.marketListing.groupBy({
    by: ["category"],
    where,
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category, r._count._all]));
}

export async function getMarketListing(slug: string) {
  return db.marketListing.findUnique({
    where: { slug },
    include: {
      seller: {
        select: {
          id: true,
          forumName: true,
          createdAt: true,
          city: true,
          state: true,
          _count: { select: { marketListings: { where: liveWhere() } } },
        },
      },
      sellerBusiness: { select: { name: true, slug: true, logoUrl: true, verified: true } },
      _count: { select: { favorites: true } },
    },
  });
}

export async function getSimilarListings(listing: { id: string; category: string }, take = 4) {
  return db.marketListing.findMany({
    where: { ...liveWhere(), category: listing.category, id: { not: listing.id } },
    orderBy: { bumpedAt: "desc" },
    take,
    select: CARD_SELECT,
  });
}

export async function getMyMarketListings(sellerId: string) {
  return db.marketListing.findMany({
    where: { sellerId },
    orderBy: { updatedAt: "desc" },
    select: { ...CARD_SELECT, views: true, _count: { select: { favorites: true } } },
  });
}

export async function getSavedMarketListings(userId: string) {
  const rows = await db.marketFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { listing: { select: CARD_SELECT } },
  });
  return rows.map((r) => ({ ...r.listing, saved: true }));
}

// Mark which of these cards the viewer has saved.
export async function attachSaved<T extends { id: string }>(
  items: T[],
  userId: string | null | undefined,
): Promise<(T & { saved: boolean })[]> {
  if (!userId || items.length === 0) return items.map((i) => ({ ...i, saved: false }));
  const saved = new Set(
    (
      await db.marketFavorite.findMany({
        where: { userId, listingId: { in: items.map((i) => i.id) } },
        select: { listingId: true },
      })
    ).map((r) => r.listingId),
  );
  return items.map((i) => ({ ...i, saved: saved.has(i.id) }));
}

// Best-effort view counter (never blocks the page).
export function countView(id: string): void {
  db.marketListing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
}

// --- Seller reputation ----------------------------------------------------
export async function getSellerRating(sellerId: string) {
  const a = await db.marketSellerReview.aggregate({
    where: { sellerId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { avg: a._avg.rating ?? 0, count: a._count._all };
}

export async function getSellerReviews(sellerId: string, take = 6) {
  return db.marketSellerReview.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      reviewer: { select: { id: true, forumName: true } },
      listing: { select: { title: true, slug: true } },
    },
  });
}

export async function getViewerSellerReview(sellerId: string, viewerId: string | null | undefined) {
  if (!viewerId) return null;
  return db.marketSellerReview.findUnique({
    where: { sellerId_reviewerId: { sellerId, reviewerId: viewerId } },
    select: { id: true, rating: true, body: true },
  });
}

// True when the two members share a DM thread — the bar for leaving a rating.
export async function hasConversationBetween(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const convo = await db.conversation.findFirst({
    where: {
      AND: [{ participants: { some: { userId: a } } }, { participants: { some: { userId: b } } }],
    },
    select: { id: true },
  });
  return !!convo;
}

// --- Admin ----------------------------------------------------------------
export async function getMarketAdminStats() {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [active, soldMonth, newWeek, removed, paused, openReports, sellers, byCategory, views, favorites] = await Promise.all([
    db.marketListing.count({ where: liveWhere() }),
    db.marketListing.count({ where: { status: "SOLD", updatedAt: { gte: month } } }),
    db.marketListing.count({ where: { createdAt: { gte: week } } }),
    db.marketListing.count({ where: { status: "REMOVED" } }),
    db.marketListing.count({ where: { status: "PAUSED" } }),
    db.report.count({ where: { marketListingId: { not: null }, status: "OPEN" } }),
    db.marketListing.groupBy({ by: ["sellerId"], _count: { _all: true } }).then((r) => r.length),
    db.marketListing.groupBy({ by: ["category"], where: liveWhere(), _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 8 }),
    db.marketListing.aggregate({ _sum: { views: true } }),
    db.marketFavorite.count(),
  ]);
  return {
    active,
    soldMonth,
    newWeek,
    removed,
    paused,
    openReports,
    sellers,
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count._all })),
    views: views._sum.views ?? 0,
    favorites,
  };
}

export async function getMarketAdminListings(opts: { q?: string; status?: string } = {}) {
  const { q, status } = opts;
  return db.marketListing.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { seller: { forumName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      price: true,
      priceType: true,
      status: true,
      photos: true,
      views: true,
      createdAt: true,
      bumpedAt: true,
      seller: { select: { id: true, forumName: true } },
      _count: { select: { reports: { where: { status: "OPEN" } }, favorites: true } },
    },
  });
}
