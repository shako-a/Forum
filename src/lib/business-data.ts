import { db } from "@/lib/db";

export type DirectoryFilters = { q?: string; category?: string; state?: string };

// Average rating from the denormalized aggregate (0 when no reviews).
export function avgRating(b: { ratingCount: number; ratingSum: number }): number {
  return b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
}

// Public directory: featured businesses first, then newest. Optional text /
// category / location filters.
export async function getBusinessDirectory(filters: DirectoryFilters = {}) {
  const { q, category, state } = filters;
  return db.business.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(state ? { state } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      category: true,
      logoUrl: true,
      city: true,
      state: true,
      verified: true,
      featured: true,
      ratingCount: true,
      ratingSum: true,
      owner: { select: { forumName: true } },
    },
  });
}

// A single public business profile with its reviews and active jobs.
export async function getBusinessProfile(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, forumName: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { forumName: true } } },
      },
      jobs: { where: { active: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

// Businesses owned by a given user (their management list).
export async function getMyBusinesses(ownerId: string) {
  return db.business.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reviews: true, jobs: true } } },
  });
}

// Cross-business jobs board: all active postings, newest first.
export async function getJobsBoard() {
  return db.jobPosting.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      business: { select: { slug: true, name: true, logoUrl: true, verified: true, category: true } },
    },
  });
}
