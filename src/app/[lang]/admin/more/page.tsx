import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { priceAt } from "@/lib/packages";
import { seedPaidPackages, packagesNeedSeeding, ensureFeatureAdditions } from "@/lib/packages-seed";
import { PackageAdmin, type AdminPackage, type AdminFeature } from "@/components/admin/PackageAdmin";
import { PostingAccessAdmin, type PostingAreaRow } from "@/components/admin/PostingAccessAdmin";
import { getPostingAccess, POSTING_AREAS, POSTING_PERK_KEY } from "@/lib/posting-access";
import { EventAccessAdmin, type EventLabelOption } from "@/components/admin/EventAccessAdmin";
import { getEventAccess, EVENT_PERK_KEY } from "@/lib/event-access";

export const dynamic = "force-dynamic";

export default async function AdminMorePage({ params }: PageProps<"/[lang]/admin/more">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // pricing is admin-only
  const dict = await getDictionary(lang);

  // First visit on a fresh database imports the packages that used to be
  // hardcoded, so the admin lands on real rows instead of an empty screen.
  if (await packagesNeedSeeding()) await seedPaidPackages();
  // Perks shipped after launch (job posting, real estate) self-install once.
  await ensureFeatureAdditions();

  const [pkgRows, featureRows] = await Promise.all([
    db.paidPackage.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { grants: true, features: true } } },
    }),
    db.feature.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { packages: true } } },
    }),
  ]);

  const now = new Date();
  const packages: AdminPackage[] = pkgRows.map((p) => {
    const { effectiveCents, live, percentOff } = priceAt(p, now);
    return {
      id: p.id,
      key: p.key,
      slug: p.slug,
      isBuiltIn: p.isBuiltIn,
      name: lang === "ka" ? p.nameKa : p.nameEn,
      icon: p.icon,
      accent: p.accent,
      priceCents: p.priceCents,
      effectiveCents,
      isActive: p.isActive,
      featured: p.featured,
      perkCount: p._count.features,
      holders: p._count.grants,
      // Three distinct states worth surfacing at a glance: running now,
      // configured but not started yet, and configured but already over.
      discountState: !p.discountType
        ? null
        : live
          ? "live"
          : p.discountEndsAt && now > p.discountEndsAt
            ? "ended"
            : "scheduled",
      percentOff,
      discountEndsAt: p.discountEndsAt ? p.discountEndsAt.toISOString() : null,
    };
  });

  const features: AdminFeature[] = featureRows.map((f) => ({
    id: f.id,
    key: f.key,
    nameEn: f.nameEn,
    nameKa: f.nameKa,
    isActive: f.isActive,
    usedBy: f._count.packages,
  }));

  // Posting access: which packages carry each area's perk key, for context.
  const [access, perkRows] = await Promise.all([
    getPostingAccess(),
    db.feature.findMany({
      where: { key: { in: Object.values(POSTING_PERK_KEY) } },
      select: {
        key: true,
        nameEn: true,
        nameKa: true,
        packages: { where: { included: true, package: { isActive: true } }, select: { package: { select: { nameEn: true, nameKa: true } } } },
      },
    }),
  ]);
  const areaLabel: Record<(typeof POSTING_AREAS)[number], string> = {
    estate: dict.estate.directory,
    market: dict.market.directory,
    auto: dict.auto.directory,
    jobs: dict.business.jobsBoard,
  };
  const postingRows: PostingAreaRow[] = POSTING_AREAS.map((area) => {
    const key = POSTING_PERK_KEY[area];
    const f = perkRows.find((r) => r.key === key);
    return {
      area,
      label: areaLabel[area],
      perkKey: key,
      perkName: f ? (lang === "ka" ? f.nameKa : f.nameEn) : "—",
      packages: f ? f.packages.map((p) => (lang === "ka" ? p.package.nameKa : p.package.nameEn)) : [],
    };
  });

  // Event gate: current mode, the tags it can point at, and enough context to
  // see the effect of a change before making it.
  const [eventAccess, labelRows, eventCount, eventPerk] = await Promise.all([
    getEventAccess(),
    db.label.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, nameKa: true, _count: { select: { users: true } } },
    }),
    db.post.count({ where: { kind: "EVENT" } }),
    db.feature.findUnique({
      where: { key: EVENT_PERK_KEY },
      select: {
        packages: {
          where: { included: true, package: { isActive: true } },
          select: { package: { select: { nameEn: true, nameKa: true } } },
        },
      },
    }),
  ]);
  const eventLabels: EventLabelOption[] = labelRows.map((l) => ({
    id: l.id,
    name: lang === "ka" ? l.nameKa : l.nameEn,
    holders: l._count.users,
  }));
  // How many members the current gate actually lets through — staff always,
  // plus whoever the mode admits.
  const staffWhere: Prisma.UserWhereInput = { role: { in: ["ADMIN", "MODERATOR"] } };
  const eligible = await db.user.count({
    where: {
      status: "ACTIVE",
      OR: [
        staffWhere,
        eventAccess.mode === "all"
          ? {}
          : eventAccess.mode === "verified"
            ? { emailVerified: true }
            : eventAccess.mode === "label"
              ? eventAccess.labelId
                ? { labels: { some: { id: eventAccess.labelId } } }
                : { id: "" }
              : eventAccess.mode === "perk"
                ? { OR: [{ isPro: true }, { packages: { some: { package: { features: { some: { included: true, feature: { key: EVENT_PERK_KEY } } } } } } }] }
                : { id: "" },
      ],
    },
  });

  return (
    <>
      <EventAccessAdmin
        dict={dict}
        access={eventAccess}
        labels={eventLabels}
        perkPackages={eventPerk ? eventPerk.packages.map((p) => (lang === "ka" ? p.package.nameKa : p.package.nameEn)) : []}
        eventCount={eventCount}
        eligible={eligible}
      />
      <PostingAccessAdmin dict={dict} rows={postingRows} access={access} />
      <PackageAdmin locale={lang} dict={dict} packages={packages} features={features} />
    </>
  );
}
