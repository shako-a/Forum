import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyMerchOrders } from "@/lib/merch-data";
import { formatCents, orderStatusLabel } from "@/lib/merch";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage({ params }: PageProps<"/[lang]/market/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, orders] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyMerchOrders(user.id),
  ]);
  const t = dict.market;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market/merch`} className="btn btn-ghost btn-sm biz-back">‹ {t.merchTitle}</Link>
          <div className="account-head">
            <h1 className="account-title">📦 {t.myOrders}</h1>
            <p className="account-sub">{t.myOrdersSub}</p>
          </div>
          {orders.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noOrders}
            </div>
          ) : (
            <div className="merch-orders">
              {orders.map((o) => (
                <Link key={o.id} href={`/${lang}/market/orders/${o.number}`} className="card card-pad merch-order-row">
                  <div>
                    <strong>#{o.number}</strong>
                    <span className="muted-sm"> · {new Date(o.createdAt).toLocaleDateString()}</span>
                    <div className="muted-sm">
                      {o.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.quantity}`).join(", ")}
                    </div>
                  </div>
                  <div className="merch-order-right">
                    <span className={`merch-status merch-status-${o.status.toLowerCase()}`}>{orderStatusLabel(o.status, lang)}</span>
                    <strong>{formatCents(o.totalCents)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
