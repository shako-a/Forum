import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getAutoAdminStats, getAutoAdminListings } from "@/lib/auto-data";
import { AUTO_BODY_TYPES, makeName, autoIcon, autoLabel } from "@/lib/auto";
import { stateLabel } from "@/lib/us-states";
import { AutoAdmin, type AdminAutoListing } from "@/components/admin/AutoAdmin";

export const dynamic = "force-dynamic";

export default async function AdminAutoPage({ params, searchParams }: PageProps<"/[lang]/admin/auto">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const kind = typeof sp.kind === "string" ? sp.kind : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const [stats, rows, featuredRows] = await Promise.all([
    getAutoAdminStats(),
    getAutoAdminListings({ q, kind, status }),
    getAutoAdminListings({ status: "featured" }),
  ]);
  const t = dict.admin;
  const base = `/${lang}/admin`;
  const toRow = (l: (typeof rows)[number]): AdminAutoListing => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    kind: l.kind,
    price: l.price,
    mileage: l.mileage,
    location: [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", "),
    thumb: l.photos[0] ?? null,
    status: l.status,
    featured: l.featured,
    views: l.views,
    openReports: l._count.reports,
    ownerId: l.owner.id,
    ownerName: l.owner.forumName,
    createdAt: l.createdAt.toISOString(),
  });

  const tiles = [
    { label: t.reActive, value: stats.active, icon: "🚗", href: `${base}/auto?status=ACTIVE` },
    { label: dict.auto.forSale, value: stats.byKind.SALE ?? 0, icon: "🏷️", href: `${base}/auto?kind=SALE` },
    { label: dict.auto.forRent, value: stats.byKind.RENT ?? 0, icon: "🔑", href: `${base}/auto?kind=RENT` },
    { label: t.mkSoldMonth, value: stats.soldMonth, icon: "✅", href: `${base}/auto?status=SOLD` },
    { label: t.mkNewWeek, value: stats.newWeek, icon: "🆕", href: `${base}/auto` },
    { label: t.reOwners, value: stats.owners, icon: "👥", href: `${base}/auto` },
    { label: t.mkViews, value: stats.views, icon: "👁", href: `${base}/auto` },
    { label: t.reFeatured, value: stats.featured, icon: "★", href: `${base}/auto?status=featured` },
    { label: t.mkRemoved, value: stats.removed, icon: "🚫", href: `${base}/auto?status=REMOVED` },
    { label: t.mkOpenReports, value: stats.openReports, icon: "⚑", href: `${base}/reports?type=auto` },
  ];

  return (
    <div>
      <h1 className="admin-h1">🚗 {t.autoAdmin}</h1>
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
          <h2 className="admin-section-title">{t.autoByMake}</h2>
          <ul className="admin-mini-list">
            {stats.byMake.map((x) => <li key={x.make}><span>{makeName(x.make)}</span><strong>{x.count}</strong></li>)}
            {stats.byMake.length === 0 && <li className="muted-sm">—</li>}
          </ul>
        </div>
        <div className="admin-section">
          <h2 className="admin-section-title">{t.autoByBody}</h2>
          <ul className="admin-mini-list">
            {stats.byBody.map((x) => (
              <li key={x.bodyType ?? "none"}>
                <span>{x.bodyType ? `${autoIcon(AUTO_BODY_TYPES, x.bodyType)} ${autoLabel(AUTO_BODY_TYPES, x.bodyType, lang)}` : "—"}</span>
                <strong>{x.count}</strong>
              </li>
            ))}
            {stats.byBody.length === 0 && <li className="muted-sm">—</li>}
          </ul>
          <h2 className="admin-section-title" style={{ marginTop: 14 }}>{t.quickLinks}</h2>
          <ul className="admin-mini-list">
            <li><Link href={`${base}/reports?type=auto`} className="admin-link">⚑ {t.reports}</Link></li>
            <li><a href={`/${lang}/auto`} target="_blank" rel="noreferrer" className="admin-link">↗ {dict.auto.directory}</a></li>
            <li><a href={`/${lang}/auto/new`} target="_blank" rel="noreferrer" className="admin-link">＋ {dict.auto.post}</a></li>
          </ul>
        </div>
      </div>
      <AutoAdmin dict={dict} locale={lang} listings={rows.map(toRow)} featured={featuredRows.filter((f) => f.status === "ACTIVE").map(toRow)} q={q} kind={kind} status={status} />
    </div>
  );
}
