import { db } from "@/lib/db";
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
  photos: true,
  createdAt: true,
} satisfies Prisma.PropertyListingSelect;

// Public directory: active listings, newest first, with all the search filters.
export async function getListingDirectory(filters: ListingFilters = {}) {
  const { q, kind, propertyType, state, minPrice, maxPrice, minBedrooms, minBathrooms, minRooms } =
    filters;
  return db.propertyListing.findMany({
    where: {
      active: true,
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
    orderBy: { createdAt: "desc" },
    take: 100,
    select: CARD_SELECT,
  });
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
