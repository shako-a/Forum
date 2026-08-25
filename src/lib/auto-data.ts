import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { lookupZip, boundingBox, distanceMiles, type LatLng } from "@/lib/geo";
import type { AutoSort } from "@/lib/auto";

export const AUTO_PAGE_SIZE = 24;
export const AUTO_PAGE_SIZES = [24, 48, 96] as const;

export type AutoFilters = {
  q?: string;
  kind?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  minPrice?: number;
  maxPrice?: number;
  negotiableOnly?: boolean;
  maxMileage?: number;
  bodyType?: string;
  transmission?: string;
  fuel?: string;
  insuredOnly?: boolean; // rentals
  state?: string;
  zip?: string;
  radius?: number;
  sort?: AutoSort;
};

const CARD_SELECT = {
  id: true,
  slug: true,
  kind: true,
  year: true,
  make: true,
  makeOther: true,
  model: true,
  title: true,
  bodyType: true,
  mileage: true,
  transmission: true,
  fuel: true,
  price: true,
  negotiable: true,
  insured: true,
  photos: true,
  city: true,
  state: true,
  lat: true,
  lng: true,
  status: true,
  featured: true,
  createdAt: true,
} satisfies Prisma.AutoListingSelect;

export type AutoCardRow = Prisma.AutoListingGetPayload<{ select: typeof CARD_SELECT }> & {
  distance?: number;
};

const RADIUS_SCAN_LIMIT = 1000;

function radiusOf(f: AutoFilters): { center: LatLng; miles: number } | null {
  if (!f.zip || !f.radius) return null;
  const center = lookupZip(f.zip);
  return center ? { center, miles: f.radius } : null;
}

function filtersWhere(f: AutoFilters, includeMake = true): Prisma.AutoListingWhereInput {
  const r = radiusOf(f);
  const box = r ? boundingBox(r.center, r.miles) : null;
  return {
    status: "ACTIVE",
    ...(f.kind ? { kind: f.kind } : {}),
    ...(includeMake && f.make ? { make: f.make } : {}),
    ...(f.model ? { model: { contains: f.model, mode: "insensitive" as const } } : {}),
    ...(f.yearMin || f.yearMax
      ? { year: { ...(f.yearMin ? { gte: f.yearMin } : {}), ...(f.yearMax ? { lte: f.yearMax } : {}) } }
      : {}),
    ...(f.minPrice || f.maxPrice
      ? { price: { ...(f.minPrice ? { gte: f.minPrice } : {}), ...(f.maxPrice ? { lte: f.maxPrice } : {}) } }
      : {}),
    ...(f.negotiableOnly ? { negotiable: true } : {}),
    ...(f.maxMileage ? { mileage: { lte: f.maxMileage } } : {}),
    ...(f.bodyType ? { bodyType: f.bodyType } : {}),
    ...(f.transmission ? { transmission: f.transmission } : {}),
    ...(f.fuel ? { fuel: f.fuel } : {}),
    ...(f.insuredOnly ? { insured: true } : {}),
    ...(f.state ? { state: f.state } : {}),
    ...(box
      ? { lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } }
      : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" as const } },
            { description: { contains: f.q, mode: "insensitive" as const } },
            { color: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

function orderFor(sort: AutoSort | undefined): Prisma.AutoListingOrderByWithRelationInput[] {
  switch (sort) {
    case "priceAsc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "priceDesc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "yearDesc":
      return [{ year: "desc" }, { createdAt: "desc" }];
    case "mileageAsc":
      return [{ mileage: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function getAutoDirectory(filters: AutoFilters, page = 1, pageSize = AUTO_PAGE_SIZE) {
  const where = filtersWhere(filters);
  const radius = radiusOf(filters);

  if (radius) {
    const rows = await db.autoListing.findMany({ where, orderBy: orderFor(filters.sort), take: RADIUS_SCAN_LIMIT, select: CARD_SELECT });
    const within = rows
      .flatMap((r) =>
        r.lat == null || r.lng == null ? [] : [{ ...r, distance: distanceMiles(radius.center, { lat: r.lat, lng: r.lng }) }],
      )
      .filter((r) => r.distance <= radius.miles);
    if (filters.sort === "nearest" || !filters.sort) within.sort((a, b) => a.distance - b.distance);
    const total = within.length;
    return { items: within.slice((page - 1) * pageSize, page * pageSize), total, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  const [total, items] = await Promise.all([
    db.autoListing.count({ where }),
    db.autoListing.findMany({ where, orderBy: orderFor(filters.sort), skip: (page - 1) * pageSize, take: pageSize, select: CARD_SELECT }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Live counts per make honoring every other filter (for the make list).
export async function getAutoMakeCounts(filters: AutoFilters): Promise<Record<string, number>> {
  const where = filtersWhere(filters, false);
  const radius = radiusOf(filters);
  if (radius) {
    const rows = await db.autoListing.findMany({ where, take: RADIUS_SCAN_LIMIT, select: { make: true, lat: true, lng: true } });
    const out: Record<string, number> = {};
    for (const r of rows) {
      if (r.lat == null || r.lng == null) continue;
      if (distanceMiles(radius.center, { lat: r.lat, lng: r.lng }) > radius.miles) continue;
      out[r.make] = (out[r.make] ?? 0) + 1;
    }
    return out;
  }
  const rows = await db.autoListing.groupBy({ by: ["make"], where, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.make, r._count._all]));
}

export async function getAutoListing(slug: string) {
  return db.autoListing.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          forumName: true,
          createdAt: true,
          _count: { select: { autoListings: { where: { status: "ACTIVE" } } } },
        },
      },
    },
  });
}

export async function getSimilarAuto(listing: { id: string; make: string; kind: string; bodyType: string | null }, take = 4) {
  return db.autoListing.findMany({
    where: {
      status: "ACTIVE",
      id: { not: listing.id },
      kind: listing.kind,
      OR: [{ make: listing.make }, ...(listing.bodyType ? [{ bodyType: listing.bodyType }] : [])],
    },
    orderBy: { createdAt: "desc" },
    take,
    select: CARD_SELECT,
  });
}

export async function getMyAutoListings(ownerId: string) {
  return db.autoListing.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: { ...CARD_SELECT, views: true, removedReason: true },
  });
}

export async function getFeaturedAuto(take = 8) {
  return db.autoListing.findMany({
    where: { status: "ACTIVE", featured: true },
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
    take,
    select: CARD_SELECT,
  });
}

export function countAutoView(id: string): void {
  db.autoListing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
}

// --- Admin ----------------------------------------------------------------
export async function getAutoAdminStats() {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [active, soldMonth, newWeek, byKind, byMake, byBody, views, featured, removed, openReports, owners] = await Promise.all([
    db.autoListing.count({ where: { status: "ACTIVE" } }),
    db.autoListing.count({ where: { status: "SOLD", updatedAt: { gte: month } } }),
    db.autoListing.count({ where: { createdAt: { gte: week } } }),
    db.autoListing.groupBy({ by: ["kind"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    db.autoListing.groupBy({ by: ["make"], where: { status: "ACTIVE" }, _count: { _all: true }, orderBy: { _count: { make: "desc" } }, take: 8 }),
    db.autoListing.groupBy({ by: ["bodyType"], where: { status: "ACTIVE" }, _count: { _all: true }, orderBy: { _count: { bodyType: "desc" } } }),
    db.autoListing.aggregate({ _sum: { views: true } }),
    db.autoListing.count({ where: { featured: true, status: "ACTIVE" } }),
    db.autoListing.count({ where: { status: "REMOVED" } }),
    db.report.count({ where: { autoListingId: { not: null }, status: "OPEN" } }),
    db.autoListing.groupBy({ by: ["ownerId"], _count: { _all: true } }).then((r) => r.length),
  ]);
  return {
    active,
    soldMonth,
    newWeek,
    byKind: Object.fromEntries(byKind.map((k) => [k.kind, k._count._all])) as Record<string, number>,
    byMake: byMake.map((m) => ({ make: m.make, count: m._count._all })),
    byBody: byBody.map((b) => ({ bodyType: b.bodyType, count: b._count._all })),
    views: views._sum.views ?? 0,
    featured,
    removed,
    openReports,
    owners,
  };
}

export async function getAutoAdminListings(opts: { q?: string; kind?: string; status?: string } = {}) {
  const { q, kind, status } = opts;
  return db.autoListing.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(status === "featured" ? { featured: true } : status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { vin: { contains: q, mode: "insensitive" as const } },
              { owner: { forumName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { featuredOrder: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: {
      ...CARD_SELECT,
      views: true,
      featuredOrder: true,
      owner: { select: { id: true, forumName: true } },
      _count: { select: { reports: { where: { status: "OPEN" } } } },
    },
  });
}
