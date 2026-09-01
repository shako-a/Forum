import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getMarketAdminStats, getMarketAdminListings } from "@/lib/market-data";
import { MARKET_CATEGORIES, labelOf, iconOf } from "@/lib/market";
import { MarketAdmin, type AdminMarketListing } from "@/components/admin/MarketAdmin";

export const dynamic = "force-dynamic";

export default async function AdminMarketPage({ params, searchParams }: PageProps<"/[lang]/admin/market">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const [stats, rows] = await Promise.all([getMarketAdminStats(), getMarketAdminListings({ q, status })]);
  const t = dict.admin;
  const base = `/${lang}/admin`;
  const tiles = [
    { label: t.mkActive, value: stats.active, icon: "🛍️", href: `${base}/market?status=ACTIVE` },
    { label: t.mkSoldMonth, value: stats.soldMonth, icon: "✅", href: `${base}/market?status=SOLD` },
    { label: t.mkNewWeek, value: stats.newWeek, icon: "🆕", href: `${base}/market` },
    { label: t.mkSellers, value: stats.sellers, icon: "👥", href: `${base}/market` },
    { label: t.mkViews, value: stats.views, icon: "👁", href: `${base}/market` },
    { label: t.mkSaves, value: stats.favorites, icon: "♥", href: `${base}/market` },
    { label: t.mkRemoved, value: stats.removed, icon: "🚫", href: `${base}/market?status=REMOVED` },
    { label: t.mkOpenReports, value: stats.openReports, icon: "⚑", href: `${base}/reports?type=market` },
  ];

  const listings: AdminMarketListing[] = rows.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    category: l.category,
    priceLabel: l.priceType === "FREE" ? dict.market.free : `$${l.price.toLocaleString("en-US")}`,
    status: l.status,
    thumb: l.photos[0] ?? null,
    views: l.views,
    favorites: l._count.favorites,
    openReports: l._count.reports,
    sellerId: l.seller.id,
    sellerName: l.seller.forumName,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="admin-h1">{t.marketOverview}</h1>
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
          <h2 className="admin-section-title">{t.topCategories}</h2>
          <ul className="admin-mini-list">
            {stats.byCategory.map((c) => (
              <li key={c.category}>
                <span>{iconOf(MARKET_CATEGORIES, c.category)} {labelOf(MARKET_CATEGORIES, c.category, lang)}</span>
                <strong>{c.count}</strong>
              </li>
            ))}
            {stats.byCategory.length === 0 && <li className="muted-sm">—</li>}
          </ul>
        </div>
        <div className="admin-section">
          <h2 className="admin-section-title">{t.quickLinks}</h2>
          <ul className="admin-mini-list">
            <li><Link href={`${base}/merch`} className="admin-link">🧢 {t.merchProducts}</Link></li>
            <li><Link href={`${base}/merch/orders`} className="admin-link">📦 {t.merchOrders}</Link></li>
            <li><Link href={`${base}/reports?type=market`} className="admin-link">⚑ {t.reports}</Link></li>
            <li><a href={`/${lang}/market`} target="_blank" rel="noreferrer" className="admin-link">↗ {dict.market.directory}</a></li>
          </ul>
        </div>
      </div>

      <MarketAdmin dict={dict} locale={lang} listings={listings} q={q} status={status} />
    </div>
  );
}
