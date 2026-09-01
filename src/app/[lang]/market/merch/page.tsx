import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMerchProducts } from "@/lib/merch-data";
import { formatCents, MERCH_CATEGORIES } from "@/lib/merch";
import { labelOf } from "@/lib/market";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";

export const dynamic = "force-dynamic";

export default async function MerchShopPage({ params }: PageProps<"/[lang]/market/merch">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user, allCategories, products] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMerchProducts(),
  ]);
  const t = dict.market;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market`} className="btn btn-ghost btn-sm biz-back">‹ {t.directory}</Link>
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">🧢 {t.merchTitle}</h1>
              <p className="account-sub">{t.merchSub}</p>
            </div>
            {user && (
              <Link href={`/${lang}/market/orders`} className="btn btn-ghost btn-sm">📦 {t.myOrders}</Link>
            )}
          </div>
          {products.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.merchEmpty}
            </div>
          ) : (
            <div className="merch-grid">
              {products.map((p) => {
                const soldOut = p.variants.length > 0 && p.variants.every((v) => v.stock <= 0);
                return (
                  <Link key={p.id} href={`/${lang}/market/merch/${p.slug}`} className="merch-card">
                    <div className="merch-tile-img">
                      {p.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photos[0]} alt="" loading="lazy" />
                      ) : (
                        <span>🧢</span>
                      )}
                      {soldOut && <span className="merch-soldout">{t.merchSoldOut}</span>}
                    </div>
                    <div className="merch-card-body">
                      <div className="merch-tile-price">{formatCents(p.priceCents)}</div>
                      <div className="merch-tile-name">{p.name}</div>
                      <div className="muted-sm">{labelOf(MERCH_CATEGORIES, p.category, lang)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
