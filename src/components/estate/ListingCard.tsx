import Link from "next/link";
import { PhotoSlider } from "@/components/estate/PhotoSlider";
import { propertyTypeIcon, propertyTypeLabel, formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type ListingCardData = {
  id: string;
  slug: string;
  kind: string;
  propertyType: string;
  title: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  areaSqFt: number | null;
  city: string | null;
  state: string;
  photos: string[];
  active?: boolean;
};

// Directory card: slideable photo strip on top, facts below. The photo and the
// body both link to the listing; slider arrows only slide.
export function ListingCard({
  locale,
  dict,
  listing,
  footer,
}: {
  locale: Locale;
  dict: Dictionary;
  listing: ListingCardData;
  footer?: React.ReactNode; // extra actions (e.g. Edit on the "mine" page)
}) {
  const t = dict.estate;
  const l = listing;
  const href = `/${locale}/realestate/${l.slug}`;
  const facts = [
    l.bedrooms != null && `🛏 ${l.bedrooms} ${t.bd}`,
    l.bathrooms != null && `🛁 ${l.bathrooms} ${t.ba}`,
    l.areaSqFt != null && `📐 ${l.areaSqFt.toLocaleString("en-US")} ${t.sqft}`,
  ].filter(Boolean) as string[];
  const location = [l.city, stateLabel(l.state, locale)].filter(Boolean).join(", ");

  return (
    <div className={`re-card${l.active === false ? " re-card-inactive" : ""}`}>
      <PhotoSlider
        photos={l.photos}
        href={href}
        alt={l.title}
        placeholder={propertyTypeIcon(l.propertyType)}
      />
      <Link href={href} className="re-card-body">
        <div className="re-card-toprow">
          <span className="re-card-price">
            {formatPrice(l.price)}
            {l.kind === "RENT" && <span className="re-card-permo">{t.perMonth}</span>}
          </span>
          <span className={`re-kind-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"}`}>
            {l.kind === "RENT" ? t.forRent : t.forSale}
          </span>
        </div>
        <h3 className="re-card-title">{l.title}</h3>
        {facts.length > 0 && <div className="re-card-facts">{facts.join(" · ")}</div>}
        <div className="re-card-meta">
          <span>
            {propertyTypeIcon(l.propertyType)} {propertyTypeLabel(l.propertyType, locale)}
          </span>
          {location && (
            <>
              <span className="sep">·</span>
              <span>📍 {location}</span>
            </>
          )}
        </div>
        {l.active === false && <span className="re-unlisted">{t.unlisted}</span>}
      </Link>
      {footer && <div className="re-card-footer">{footer}</div>}
    </div>
  );
}
