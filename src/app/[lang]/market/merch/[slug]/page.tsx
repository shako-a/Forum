import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMerchProduct } from "@/lib/merch-data";
import { formatCents, MERCH_CATEGORIES } from "@/lib/merch";
import { labelOf } from "@/lib/market";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Gallery } from "@/components/estate/Gallery";
import { MerchOrderForm } from "@/components/market/MerchOrderForm";

export const dynamic = "force-dynamic";

export default async function MerchProductPage({ params }: PageProps<"/[lang]/market/merch/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user, allCategories, product] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMerchProduct(slug),
  ]);
  if (!product || (!product.active && user?.role !== "ADMIN")) notFound();
  const t = dict.market;
  // Contact prefill for the order form (getCurrentUser doesn't carry these).
  const me = user
    ? await db.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, email: true, phone: true } })
    : null;
  const href = `/${lang}/market/merch/${product.slug}`;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market/merch`} className="btn btn-ghost btn-sm biz-back">‹ {t.merchTitle}</Link>
          {!product.active && <div className="mk-status-banner">⏸ {t.merchInactive}</div>}

          <div className="merch-product">
            <div className="merch-product-media">
              {product.photos.length > 0 ? (
                <Gallery photos={product.photos} alt={product.name} />
              ) : (
                <div className="merch-tile-img merch-product-placeholder"><span>🧢</span></div>
              )}
            </div>
            <div className="merch-product-info card card-pad">
              <div className="muted-sm">{labelOf(MERCH_CATEGORIES, product.category, lang)}</div>
              <h1 className="mk-detail-title">{product.name}</h1>
              <div className="mk-detail-price">{formatCents(product.priceCents)}</div>
              <p className="biz-description merch-desc">{product.description}</p>
              {user?.role === "ADMIN" && (
                <Link href={`/${lang}/admin/merch/${product.id}`} className="btn btn-ghost btn-sm">✏️ {dict.admin.edit}</Link>
              )}
            </div>
          </div>

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">🛒 {t.orderTitle}</h2>
            <MerchOrderForm
              locale={lang}
              dict={dict}
              productId={product.id}
              priceCents={product.priceCents}
              variants={product.variants.map((v) => ({ id: v.id, label: v.label, stock: v.stock, priceDeltaCents: v.priceDeltaCents }))}
              loggedIn={!!user}
              loginHref={`/${lang}/login?next=${encodeURIComponent(href)}`}
              prefill={{
                name: me ? `${me.firstName} ${me.lastName}`.trim() : "",
                email: me?.email ?? "",
                phone: me?.phone ?? "",
              }}
            />
          </div>
        </main>
      </div>
    </>
  );
}
