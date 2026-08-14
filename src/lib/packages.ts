import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import type { DiscountType } from "@/generated/prisma/client";

// Read-side for the admin-managed paid packages. The public pages render from
// these shapes; nothing about a package is hardcoded any more.

export type PackagePerk = {
  key: string;
  name: string;
  /** false → rendered struck through ("this package does NOT include X"). */
  included: boolean;
};

export type PublicPackage = {
  id: string;
  key: string;
  slug: string;
  name: string;
  blurb: string;
  pitch: string;
  icon: string;
  accent: string;
  featured: boolean;
  isActive: boolean;
  /** List price, before any discount. */
  priceCents: number;
  /** What the user actually pays right now (== priceCents when no live discount). */
  effectiveCents: number;
  /** Set only while a discount is actually running. */
  discount: { type: DiscountType; endsAt: Date | null; percentOff: number } | null;
  perks: PackagePerk[];
};

/**
 * The price a package sells for at `now`, plus whether a discount is live.
 *
 * A discount only applies inside its window; expiry is therefore derived on
 * read rather than written by a scheduled job, which means a promo can never
 * be left switched on because a cron did not fire.
 */
export function priceAt(
  p: {
    priceCents: number;
    discountType: DiscountType | null;
    discountPercent: number | null;
    discountPriceCents: number | null;
    discountStartsAt: Date | null;
    discountEndsAt: Date | null;
  },
  now: Date = new Date(),
): { effectiveCents: number; live: boolean; percentOff: number } {
  const none = { effectiveCents: p.priceCents, live: false, percentOff: 0 };
  if (!p.discountType) return none;
  if (p.discountStartsAt && now < p.discountStartsAt) return none; // not started
  if (p.discountEndsAt && now > p.discountEndsAt) return none; // expired

  let effective: number;
  if (p.discountType === "PERCENT") {
    const pct = p.discountPercent ?? 0;
    if (pct <= 0) return none;
    effective = Math.round(p.priceCents * (1 - pct / 100));
  } else {
    if (p.discountPriceCents == null) return none;
    effective = p.discountPriceCents;
  }

  // A "discount" that costs more than list price is a data error, not an offer.
  effective = Math.max(0, Math.min(effective, p.priceCents));
  if (effective >= p.priceCents) return none;

  const percentOff = Math.round(((p.priceCents - effective) / p.priceCents) * 100);
  return { effectiveCents: effective, live: true, percentOff };
}

const withRelations = {
  features: {
    include: { feature: true },
    orderBy: { sortOrder: "asc" },
  },
} as const;

type Row = Awaited<ReturnType<typeof db.paidPackage.findMany<{ include: typeof withRelations }>>>[number];

function toPublic(p: Row, locale: Locale, now: Date): PublicPackage {
  const { effectiveCents, live, percentOff } = priceAt(p, now);
  return {
    id: p.id,
    key: p.key,
    slug: p.slug,
    name: locale === "ka" ? p.nameKa : p.nameEn,
    blurb: locale === "ka" ? p.blurbKa : p.blurbEn,
    pitch: locale === "ka" ? p.pitchKa : p.pitchEn,
    icon: p.icon,
    accent: p.accent,
    featured: p.featured,
    isActive: p.isActive,
    priceCents: p.priceCents,
    effectiveCents,
    discount: live
      ? { type: p.discountType!, endsAt: p.discountEndsAt, percentOff }
      : null,
    perks: p.features
      // A perk retired from the catalogue disappears from every package at
      // once, without having to unpick each package's list.
      .filter((pf) => pf.feature.isActive)
      // Display order comes from the perk catalogue (the admin reorders it
      // with the arrows there), so one list drives every package's card.
      // Exclusions are always pinned last regardless: "✕ no Ask AI" belongs at
      // the bottom of a card, not above the things you do get.
      .sort((a, b) =>
        a.included === b.included
          ? a.feature.sortOrder - b.feature.sortOrder
          : Number(b.included) - Number(a.included),
      )
      .map((pf) => ({
        key: pf.feature.key,
        name: locale === "ka" ? pf.feature.nameKa : pf.feature.nameEn,
        included: pf.included,
      })),
  };
}

/** Active packages for the public "მეტი" page, cheapest-first by sortOrder. */
export const getPublicPackages = cache(async (locale: Locale): Promise<PublicPackage[]> => {
  const rows = await db.paidPackage.findMany({
    where: { isActive: true },
    include: withRelations,
    orderBy: { sortOrder: "asc" },
  });
  const now = new Date();
  return rows.map((r) => toPublic(r, locale, now));
});

/** One package by its public slug. Inactive packages 404 rather than render. */
export const getPublicPackage = cache(
  async (locale: Locale, slug: string): Promise<PublicPackage | null> => {
    const row = await db.paidPackage.findUnique({ where: { slug }, include: withRelations });
    if (!row || !row.isActive) return null;
    return toPublic(row, locale, new Date());
  },
);

/**
 * Every feature key the user currently holds, across all their packages. This
 * is what lets an admin-created package actually grant something: gating asks
 * for a key rather than for one of the three original booleans.
 */
export const getUserFeatureKeys = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.userPackage.findMany({
    where: { userId, package: { isActive: true } },
    select: {
      package: {
        select: { features: { where: { included: true }, select: { feature: { select: { key: true, isActive: true } } } } },
      },
    },
  });
  const keys = new Set<string>();
  for (const r of rows) {
    for (const f of r.package.features) if (f.feature.isActive) keys.add(f.feature.key);
  }
  return [...keys];
});
