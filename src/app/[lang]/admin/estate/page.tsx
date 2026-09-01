import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getEstateAdminStats, getEstateAdminListings } from "@/lib/estate-data";
import { propertyTypeIcon, propertyTypeLabel } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { EstateAdmin, type AdminEstateListing } from "@/components/admin/EstateAdmin";

export const dynamic = "force-dynamic";

export default async function AdminEstatePage({ params, searchParams }: PageProps<"/[lang]/admin/estate">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const kind = typeof sp.kind === "string" ? sp.kind : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const [stats, rows, featuredRows] = await Promise.all([
    getEstateAdminStats(),
    getEstateAdminListings({ q, kind, status }),
    getEstateAdminListings({ status: "featured" }),
  ]);
  const t = dict.admin;
  const base = `/${lang}/admin`;
  const toRow = (l: (typeof rows)[number]): AdminEstateListing => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    kind: l.kind,
    propertyType: l.propertyType,
    price: l.price,
    location: [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", "),
    thumb: l.photos[0] ?? null,
    active: l.active,
    featured: l.featured,
    featuredOrder: l.featuredOrder,
    views: l.views,
    openReports: l._count.reports,
    ownerId: l.owner.id,
    ownerName: l.owner.forumName,
    createdAt: l.createdAt.toISOString(),
  });

  const tiles = [
    { label: t.reActive, value: stats.active, icon: "🏠", href: `${base}/estate?status=active` },
    { label: dict.estate.forSale, value: stats.byKind.SALE ?? 0, icon: "🏷️", href: `${base}/estate?kind=SALE` },
    { label: dict.estate.forRent, value: stats.byKind.RENT ?? 0, icon: "🔑", href: `${base}/estate?kind=RENT` },
    { label: t.mkNewWeek, value: stats.newWeek, icon: "🆕", href: `${base}/estate` },
    { label: t.reOwners, value: stats.owners, icon: "👥", href: `${base}/estate` },
    { label: t.mkViews, value: stats.views, icon: "👁", href: `${base}/estate` },
    { label: t.reFeatured, value: stats.featured, icon: "★", href: `${base}/estate?status=featured` },
    { label: t.reUnlisted, value: stats.unlisted, icon: "🚫", href: `${base}/estate?status=unlisted` },
    { label: t.mkOpenReports, value: stats.openReports, icon: "⚑", href: `${base}/reports?type=estate` },
  ];

  return (
    <div>
      <h1 className="admin-h1">🏠 {t.estateAdmin}</h1>
      <div className="admin-stats">
        {tiles.map((s) => (
          <Link key={s.label} href={s.href} className="admin-stat admin-stat-link">
            <span className="admin-stat-ico" aria-hidden="true">{s.icon}</span>
            <span className="admin-stat-value">{s.value}</span>
            <span className="admin-stat-label">{s.label}</span>
          </Link>
        ))}
      </div>
      <div className="admin-two-col">
        <div className="admin-section">
          <h2 className="admin-section-title">{t.reByType}</h2>
          <ul className="admin-mini-list">
            {stats.byType.map((x) => (
              <li key={x.type}><span>{propertyTypeIcon(x.type)} {propertyTypeLabel(x.type, lang)}</span><strong>{x.count}</strong></li>
            ))}
            {stats.byType.length === 0 && <li className="muted-sm">—</li>}
          </ul>
        </div>
        <div className="admin-section">
          <h2 className="admin-section-title">{t.quickLinks}</h2>
          <ul className="admin-mini-list">
            <li><Link href={`${base}/reports?type=estate`} className="admin-link">⚑ {t.reports}</Link></li>
            <li><a href={`/${lang}/realestate`} target="_blank" rel="noreferrer" className="admin-link">↗ {dict.estate.directory}</a></li>
            <li><a href={`/${lang}/realestate/new`} target="_blank" rel="noreferrer" className="admin-link">＋ {dict.estate.post}</a></li>
          </ul>
        </div>
      </div>
      <EstateAdmin dict={dict} locale={lang} listings={rows.map(toRow)} featured={featuredRows.filter((f) => f.active).map(toRow)} q={q} kind={kind} status={status} />
    </div>
  );
}
