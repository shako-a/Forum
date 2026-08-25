import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { priceAt } from "@/lib/packages";
import { seedPaidPackages, packagesNeedSeeding, ensureFeatureAdditions } from "@/lib/packages-seed";
import { PackageAdmin, type AdminPackage, type AdminFeature } from "@/components/admin/PackageAdmin";
import { PostingAccessAdmin, type PostingAreaRow } from "@/components/admin/PostingAccessAdmin";
import { getPostingAccess, POSTING_AREAS, POSTING_PERK_KEY } from "@/lib/posting-access";

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

  return (
    <>
      <PostingAccessAdmin dict={dict} rows={postingRows} access={access} />
      <PackageAdmin locale={lang} dict={dict} packages={packages} features={features} />
    </>
  );
}
