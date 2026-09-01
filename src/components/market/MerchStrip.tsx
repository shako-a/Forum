import Link from "@/components/Link";
import { formatCents } from "@/lib/merch";
import type { MerchProductCard } from "@/lib/merch-data";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Marketplace top bar: the forum's own merchandise, admin-managed.
export function MerchStrip({
  locale,
  dict,
  products,
}: {
  locale: Locale;
  dict: Dictionary;
  products: MerchProductCard[];
}) {
  const t = dict.market;
  if (products.length === 0) return null;
  return (
    <section className="merch-strip card" aria-label={t.merchTitle}>
      <div className="merch-strip-head">
        <div>
          <h2 className="merch-strip-title">🧢 {t.merchTitle}</h2>
          <p className="muted-sm">{t.merchSub}</p>
        </div>
        <Link href={`/${locale}/market/merch`} className="btn btn-ghost btn-sm">
          {t.merchShopAll} ›
        </Link>
      </div>
      <div className="merch-strip-row">
        {products.map((p) => {
          const soldOut = p.variants.length > 0 && p.variants.every((v) => v.stock <= 0);
          return (
            <Link key={p.id} href={`/${locale}/market/merch/${p.slug}`} className="merch-tile">
              <div className="merch-tile-img">
                {p.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0]} alt="" loading="lazy" />
                ) : (
                  <span>🧢</span>
                )}
                {soldOut && <span className="merch-soldout">{t.merchSoldOut}</span>}
              </div>
              <div className="merch-tile-name">{p.name}</div>
              <div className="merch-tile-price">{formatCents(p.priceCents)}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
