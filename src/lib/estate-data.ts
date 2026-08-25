import { db } from "@/lib/db";
import { lookupZip, boundingBox, distanceMiles, type LatLng } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

export type ListingFilters = {
  q?: string;
  kind?: string; // "SALE" | "RENT"
  propertyType?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minRooms?: number;
  sort?: "newest" | "nearest" | "priceAsc" | "priceDesc";
  zip?: string; // ZIP + radius: only listings that saved a ZIP can match
  radius?: number; // miles
};

// Fields the directory cards need (keeps photo arrays but skips description).
const CARD_SELECT = {
  id: true,
  slug: true,
  kind: true,
  propertyType: true,
  title: true,
  price: true,
  bedrooms: true,
  bathrooms: true,
  rooms: true,
  areaSqFt: true,
  city: true,
  state: true,
  lat: true,
  lng: true,
  photos: true,
  createdAt: true,
} satisfies Prisma.PropertyListingSelect;

export type ListingCardRow = Prisma.PropertyListingGetPayload<{ select: typeof CARD_SELECT }> & {
  distance?: number; // miles from the searched ZIP, when a radius search is on
};

// Cap on rows pulled for in-memory distance filtering.
const RADIUS_SCAN_LIMIT = 1000;

function radiusOf(f: ListingFilters): { center: LatLng; miles: number } | null {
  if (!f.zip || !f.radius) return null;
  const center = lookupZip(f.zip);
  return center ? { center, miles: f.radius } : null;
}

// Public directory: active listings, newest first, with all the search filters.
export async function getListingDirectory(filters: ListingFilters = {}): Promise<ListingCardRow[]> {
  const { q, kind, propertyType, state, minPrice, maxPrice, minBedrooms, minBathrooms, minRooms, sort } =
    filters;
  const radius = radiusOf(filters);
  const box = radius ? boundingBox(radius.center, radius.miles) : null;
  const rows = await db.propertyListing.findMany({
    where: {
      active: true,
      ...(box
        ? {
            lat: { gte: box.minLat, lte: box.maxLat },
            lng: { gte: box.minLng, lte: box.maxLng },
          }
        : {}),
      ...(kind ? { kind } : {}),
      ...(propertyType ? { propertyType } : {}),
      ...(state ? { state } : {}),
      ...(minPrice || maxPrice
        ? { price: { ...(minPrice ? { gte: minPrice } : {}), ...(maxPrice ? { lte: maxPrice } : {}) } }
        : {}),
      ...(minBedrooms ? { bedrooms: { gte: minBedrooms } } : {}),
      ...(minBathrooms ? { bathrooms: { gte: minBathrooms } } : {}),
      ...(minRooms ? { rooms: { gte: minRooms } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
              { city: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === "priceAsc"
        ? [{ price: "asc" }, { createdAt: "desc" }]
        : sort === "priceDesc"
          ? [{ price: "desc" }, { createdAt: "desc" }]
          : { createdAt: "desc" },
    take: radius ? RADIUS_SCAN_LIMIT : 100,
    select: CARD_SELECT,
  });

  if (!radius) return rows;
  // The SQL box is a square around the circle — apply the exact distance here.
  const within = rows
    .flatMap((r) =>
      r.lat == null || r.lng == null
        ? []
        : [{ ...r, distance: distanceMiles(radius.center, { lat: r.lat, lng: r.lng }) }],
    )
    .filter((r) => r.distance <= radius.miles);
  if (sort === "nearest" || !sort) within.sort((a, b) => a.distance - b.distance);
  return within.slice(0, 100);
}

// A single public listing with its owner (for the contact card).
export async function getListing(slug: string) {
  return db.propertyListing.findUnique({
    where: { slug },
    include: { owner: { select: { id: true, forumName: true } } },
  });
}

// Listings owned by a given user — including unlisted ones (their manage list).
export async function getMyListings(ownerId: string) {
  return db.propertyListing.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: { ...CARD_SELECT, active: true },
  });
}

// Banner: admin-featured listings, in curated order.
export async function getFeaturedListings(take = 8) {
  return db.propertyListing.findMany({
    where: { active: true, featured: true },
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
    take,
    select: CARD_SELECT,
  });
}

export function countEstateView(id: string): void {
  db.propertyListing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
}

// --- Admin ----------------------------------------------------------------
export async function getEstateAdminStats() {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [active, unlisted, newWeek, byKind, byType, views, featured, openReports, owners] = await Promise.all([
    db.propertyListing.count({ where: { active: true } }),
    db.propertyListing.count({ where: { active: false } }),
    db.propertyListing.count({ where: { createdAt: { gte: week } } }),
    db.propertyListing.groupBy({ by: ["kind"], where: { active: true }, _count: { _all: true } }),
    db.propertyListing.groupBy({ by: ["propertyType"], where: { active: true }, _count: { _all: true }, orderBy: { _count: { propertyType: "desc" } } }),
    db.propertyListing.aggregate({ _sum: { views: true } }),
    db.propertyListing.count({ where: { featured: true, active: true } }),
    db.report.count({ where: { propertyListingId: { not: null }, status: "OPEN" } }),
    db.propertyListing.groupBy({ by: ["ownerId"], _count: { _all: true } }).then((r) => r.length),
  ]);
  return {
    active,
    unlisted,
    newWeek,
    byKind: Object.fromEntries(byKind.map((k) => [k.kind, k._count._all])) as Record<string, number>,
    byType: byType.map((t) => ({ type: t.propertyType, count: t._count._all })),
    views: views._sum.views ?? 0,
    featured,
    openReports,
    owners,
  };
}

export async function getEstateAdminListings(opts: { q?: string; kind?: string; status?: string } = {}) {
  const { q, kind, status } = opts;
  return db.propertyListing.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(status === "active" ? { active: true } : status === "unlisted" ? { active: false } : status === "featured" ? { featured: true } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
              { owner: { forumName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { featuredOrder: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      propertyType: true,
      price: true,
      city: true,
      state: true,
      photos: true,
      active: true,
      featured: true,
      featuredOrder: true,
      views: true,
      createdAt: true,
      owner: { select: { id: true, forumName: true } },
      _count: { select: { reports: { where: { status: "OPEN" } } } },
    },
  });
}
