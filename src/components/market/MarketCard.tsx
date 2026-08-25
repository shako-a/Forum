import Link from "next/link";
import { PhotoSlider } from "@/components/estate/PhotoSlider";
import { FavoriteButton } from "@/components/market/FavoriteButton";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, iconOf, labelOf } from "@/lib/market";
import { formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import type { MarketCardRow } from "@/lib/market-data";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function marketPriceLabel(l: { price: number; priceType: string }, t: Dictionary["market"]): string {
  if (l.priceType === "FREE") return t.free;
  return formatPrice(l.price);
}

// Directory card: cover photo strip, price, title, condition, location, age,
// heart. Optional footer for owner tools (mine page).
export function MarketCard({
  locale,
  dict,
  listing,
  viewerId,
  footer,
}: {
  locale: Locale;
  dict: Dictionary;
  listing: MarketCardRow;
  viewerId: string | null | undefined;
  footer?: React.ReactNode;
}) {
  const t = dict.market;
  const l = listing;
  const href = `/${locale}/market/${l.slug}`;
  const location = [l.city, stateLabel(l.state, locale)].filter(Boolean).join(", ");
  const inactive = l.status !== "ACTIVE";

  return (
    <div className={`mk-card${inactive ? " mk-card-inactive" : ""}`}>
      <div className="mk-card-media">
        <PhotoSlider photos={l.photos} href={href} alt={l.title} placeholder={iconOf(MARKET_CATEGORIES, l.category)} />
        <FavoriteButton
          listingId={l.id}
          saved={!!l.saved}
          loggedIn={!!viewerId}
          loginHref={`/${locale}/login?next=${encodeURIComponent(href)}`}
          labels={{ save: t.save, saved: t.saved }}
        />
        {l.status === "SOLD" && <span className="mk-badge mk-badge-sold">{t.sold}</span>}
        {l.status === "PAUSED" && <span className="mk-badge mk-badge-paused">{t.paused}</span>}
        {l.canShip && l.status === "ACTIVE" && <span className="mk-badge mk-badge-ship">📦 {t.ships}</span>}
      </div>
      <Link href={href} className="mk-card-body">
        <div className="mk-card-price">
          {marketPriceLabel(l, t)}
          {l.priceType === "NEGOTIABLE" && <span className="mk-card-obo">{t.negotiableShort}</span>}
        </div>
        <h3 className="mk-card-title">{l.title}</h3>
        <div className="mk-card-meta">
          <span className="mk-cond">{labelOf(MARKET_CONDITIONS, l.condition, locale)}</span>
          {location && (
            <>
              <span className="sep">·</span>
              <span>{location}</span>
            </>
          )}
        </div>
        <div className="mk-card-meta">
          <span>{timeAgo(l.bumpedAt, locale)}</span>
          {l.sellerBusiness && (
            <>
              <span className="sep">·</span>
              <span>🏢 {l.sellerBusiness.name}</span>
            </>
          )}
        </div>
      </Link>
      {footer && <div className="mk-card-footer">{footer}</div>}
    </div>
  );
}
