import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getMerchAdminProducts, getMerchStats } from "@/lib/merch-data";
import { formatCents, orderStatusLabel, MERCH_ORDER_STATUSES } from "@/lib/merch";
import { MerchAdmin, type AdminMerchProduct } from "@/components/admin/MerchAdmin";

export const dynamic = "force-dynamic";

export default async function AdminMerchPage({ params }: PageProps<"/[lang]/admin/merch">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const [products, stats] = await Promise.all([getMerchAdminProducts(), getMerchStats()]);
  const t = dict.admin;
  const base = `/${lang}/admin/merch`;

  const tiles = [
    { label: t.merchRevenueAll, value: formatCents(stats.revenueAllCents), icon: "💰", href: `${base}/orders` },
    { label: t.merchRevenueMonth, value: formatCents(stats.revenueMonthCents), icon: "📅", href: `${base}/orders` },
    { label: t.merchOrdersMonth, value: stats.ordersMonth, icon: "🧾", href: `${base}/orders` },
    { label: t.merchUnitsSold, value: stats.unitsSold, icon: "📦", href: `${base}/orders?status=DELIVERED` },
    { label: t.merchOpenOrders, value: (stats.byStatus.NEW ?? 0) + (stats.byStatus.CONFIRMED ?? 0), icon: "🆕", href: `${base}/orders?status=NEW` },
    { label: t.merchToShip, value: stats.byStatus.PAID ?? 0, icon: "🚚", href: `${base}/orders?status=PAID` },
  ];

  const rows: AdminMerchProduct[] = products.map((p) => {
    const active = p.variants.filter((v) => v.active);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceLabel: formatCents(p.priceCents),
      thumb: p.photos[0] ?? null,
      active: p.active,
      featured: p.featured,
      stock: active.length === 0 ? null : active.reduce((s, v) => s + v.stock, 0),
      variantCount: active.length,
      ordered: p._count.items,
    };
  });

  return (
    <div>
      <div className="admin-list-head">
        <h1 className="admin-h1">🧢 {t.merchTitle}</h1>
        <Link href={`${base}/orders`} className="btn btn-ghost btn-sm">📦 {t.merchOrders}</Link>
      </div>
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
          <h2 className="admin-section-title">{t.merchByStatus}</h2>
          <ul className="admin-mini-list">
            {MERCH_ORDER_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`${base}/orders?status=${s}`} className="admin-link">{orderStatusLabel(s, lang)}</Link>
                <strong>{stats.byStatus[s] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-section">
          <h2 className="admin-section-title">{t.merchTopProducts}</h2>
          <ul className="admin-mini-list">
            {stats.topProducts.map((p) => (
              <li key={p.name}><span>{p.name}</span><strong>{p.quantity}</strong></li>
            ))}
            {stats.topProducts.length === 0 && <li className="muted-sm">—</li>}
          </ul>
          {stats.lowStock.length > 0 && (
            <>
              <h2 className="admin-section-title" style={{ marginTop: 14 }}>⚠️ {t.merchLowStock}</h2>
              <ul className="admin-mini-list">
                {stats.lowStock.map((v) => (
                  <li key={`${v.productId}-${v.label}`}>
                    <Link href={`${base}/${v.productId}`} className="admin-link">{v.product} · {v.label}</Link>
                    <strong className="report-removed">{v.stock}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <MerchAdmin dict={dict} locale={lang} products={rows} />
    </div>
  );
}
