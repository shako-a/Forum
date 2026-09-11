import "server-only";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { listingPath, type ModuleKey } from "@/lib/modules";
import { businessCategoryIcon, businessCategoryLabel } from "@/lib/business-categories";
import { formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";

// The featured bar at the foot of every module's detail page, and the
// "similar" strips above it. Cards are normalised so one component renders
// all five modules; hrefs are locale-less and prefixed at render time.

export type FeaturedCard = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  image: string | null;
  icon: string;
};

const FEATURED_ORDER = [{ featuredOrder: "asc" as const }, { createdAt: "desc" as const }];

export async function getFeaturedCards(module: ModuleKey, locale: Locale, take = 8): Promise<FeaturedCard[]> {
  const loc = (city: string | null, state: string) => [city, stateLabel(state, locale)].filter(Boolean).join(", ");
  switch (module) {
    case "business": {
      const rows = await db.business.findMany({
        where: { featured: true },
        orderBy: FEATURED_ORDER,
        take,
        select: { id: true, slug: true, name: true, category: true, logoUrl: true, photos: true },
      });
      return rows.map((b) => ({
        id: b.id,
        href: listingPath(module, b.slug),
        title: b.name,
        subtitle: businessCategoryLabel(b.category, locale),
        image: b.photos[0] ?? b.logoUrl,
        icon: businessCategoryIcon(b.category),
      }));
    }
    case "jobs": {
      const rows = await db.jobPosting.findMany({
        where: { featured: true, active: true },
        orderBy: FEATURED_ORDER,
        take,
        select: { id: true, title: true, companyName: true, city: true, state: true, business: { select: { name: true, logoUrl: true } } },
      });
      return rows.map((j) => ({
        id: j.id,
        href: listingPath(module, j.id),
        title: j.title,
        subtitle: j.business?.name ?? j.companyName ?? loc(j.city, j.state ?? ""),
        image: j.business?.logoUrl ?? null,
        icon: "💼",
      }));
    }
    case "estate": {
      const rows = await db.propertyListing.findMany({
        where: { featured: true, active: true },
        orderBy: FEATURED_ORDER,
        take,
        select: { id: true, slug: true, title: true, price: true, kind: true, photos: true, city: true, state: true },
      });
      return rows.map((l) => ({
        id: l.id,
        href: listingPath(module, l.slug),
        title: l.title,
        subtitle: `${formatPrice(l.price)}${l.kind === "RENT" ? (locale === "ka" ? "/თვე" : "/mo") : ""} · ${loc(l.city, l.state)}`,
        image: l.photos[0] ?? null,
        icon: "🏠",
      }));
    }
    case "market": {
      const rows = await db.marketListing.findMany({
        where: { featured: true, status: "ACTIVE" },
        orderBy: FEATURED_ORDER,
        take,
        select: { id: true, slug: true, title: true, price: true, priceType: true, photos: true, city: true, state: true },
      });
      return rows.map((l) => ({
        id: l.id,
        href: listingPath(module, l.slug),
        title: l.title,
        subtitle: l.priceType === "FREE" ? (locale === "ka" ? "უფასო" : "Free") : formatPrice(l.price),
        image: l.photos[0] ?? null,
        icon: "🛍️",
      }));
    }
    case "auto": {
      const rows = await db.autoListing.findMany({
        where: { featured: true, status: "ACTIVE" },
        orderBy: FEATURED_ORDER,
        take,
        select: { id: true, slug: true, title: true, price: true, kind: true, photos: true },
      });
      return rows.map((l) => ({
        id: l.id,
        href: listingPath(module, l.slug),
        title: l.title,
        subtitle: `${formatPrice(l.price)}${l.kind === "RENT" ? (locale === "ka" ? "/დღე" : "/day") : ""}`,
        image: l.photos[0] ?? null,
        icon: "🚗",
      }));
    }
  }
}

// --- Similar listings for the modules that had none ---------------------------

const BUSINESS_CARD = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  category: true,
  logoUrl: true,
  photos: true,
  city: true,
  state: true,
  verified: true,
  featured: true,
  ratingCount: true,
  ratingSum: true,
} as const;

export async function getSimilarBusinesses(biz: { id: string; category: string }, take = 4) {
  return db.business.findMany({
    where: { category: biz.category, id: { not: biz.id } },
    orderBy: [{ featured: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }],
    take,
    select: BUSINESS_CARD,
  });
}

export async function getSimilarJobs(job: { id: string; businessId: string | null; category: string | null; jobType: string | null; state: string | null }, take = 4) {
  const include = { business: { select: { slug: true, name: true, logoUrl: true, verified: true, category: true } } };
  // Same employer first; otherwise the same kind of work nearby.
  const own = job.businessId
    ? await db.jobPosting.findMany({ where: { active: true, id: { not: job.id }, businessId: job.businessId }, orderBy: { createdAt: "desc" }, take, include })
    : [];
  if (own.length >= take) return own;
  const rest = await db.jobPosting.findMany({
    where: {
      active: true,
      id: { notIn: [job.id, ...own.map((j) => j.id)] },
      OR: [
        ...(job.category ? [{ category: job.category }] : []),
        ...(job.jobType ? [{ jobType: job.jobType }] : []),
        ...(job.state ? [{ state: job.state }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: take - own.length,
    include,
  });
  return [...own, ...rest];
}

export async function getSimilarEstate(l: { id: string; kind: string; propertyType: string; state: string }, take = 4) {
  return db.propertyListing.findMany({
    where: { active: true, id: { not: l.id }, kind: l.kind, OR: [{ propertyType: l.propertyType }, { state: l.state }] },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true, slug: true, kind: true, propertyType: true, title: true, price: true,
      bedrooms: true, bathrooms: true, rooms: true, areaSqFt: true, city: true, state: true, photos: true,
    },
  });
}

export function countBusinessView(id: string): void {
  db.business.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
}

// --- Admin → Featured --------------------------------------------------------

export type FeaturedAdminRow = { id: string; title: string; subtitle: string; href: string; featured: boolean; live: boolean };

const ADMIN_TAKE = 30;

/** Current featured rows (ordered) or, with a query, candidates to add. */
export async function getFeaturedAdminRows(module: ModuleKey, locale: Locale, q?: string): Promise<FeaturedAdminRow[]> {
  const search = q?.trim() ?? "";
  const loc = (city: string | null, state: string) => [city, stateLabel(state, locale)].filter(Boolean).join(", ");
  const ci = (field: string) => (search ? { [field]: { contains: search, mode: "insensitive" as const } } : {});
  const order = search ? [{ createdAt: "desc" as const }] : FEATURED_ORDER;
  const onlyFeatured = search ? {} : { featured: true };

  switch (module) {
    case "business": {
      const rows = await db.business.findMany({
        where: { ...onlyFeatured, ...ci("name") },
        orderBy: order, take: ADMIN_TAKE,
        select: { id: true, slug: true, name: true, category: true, city: true, state: true, featured: true },
      });
      return rows.map((b) => ({ id: b.id, title: b.name, subtitle: `${businessCategoryLabel(b.category, locale)} · ${loc(b.city, b.state)}`, href: listingPath(module, b.slug), featured: b.featured, live: true }));
    }
    case "jobs": {
      const rows = await db.jobPosting.findMany({
        where: { ...onlyFeatured, ...ci("title") },
        orderBy: order, take: ADMIN_TAKE,
        select: { id: true, title: true, companyName: true, active: true, featured: true, business: { select: { name: true } } },
      });
      return rows.map((j) => ({ id: j.id, title: j.title, subtitle: j.business?.name ?? j.companyName ?? "", href: listingPath(module, j.id), featured: j.featured, live: j.active }));
    }
    case "estate": {
      const rows = await db.propertyListing.findMany({
        where: { ...onlyFeatured, ...ci("title") },
        orderBy: order, take: ADMIN_TAKE,
        select: { id: true, slug: true, title: true, price: true, city: true, state: true, active: true, featured: true },
      });
      return rows.map((l) => ({ id: l.id, title: l.title, subtitle: `${formatPrice(l.price)} · ${loc(l.city, l.state)}`, href: listingPath(module, l.slug), featured: l.featured, live: l.active }));
    }
    case "market": {
      const rows = await db.marketListing.findMany({
        where: { ...onlyFeatured, ...ci("title") },
        orderBy: order, take: ADMIN_TAKE,
        select: { id: true, slug: true, title: true, price: true, status: true, featured: true },
      });
      return rows.map((l) => ({ id: l.id, title: l.title, subtitle: formatPrice(l.price), href: listingPath(module, l.slug), featured: l.featured, live: l.status === "ACTIVE" }));
    }
    case "auto": {
      const rows = await db.autoListing.findMany({
        where: { ...onlyFeatured, ...ci("title") },
        orderBy: order, take: ADMIN_TAKE,
        select: { id: true, slug: true, title: true, price: true, status: true, featured: true },
      });
      return rows.map((l) => ({ id: l.id, title: l.title, subtitle: formatPrice(l.price), href: listingPath(module, l.slug), featured: l.featured, live: l.status === "ACTIVE" }));
    }
  }
}
