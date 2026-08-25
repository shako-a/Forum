import Link from "next/link";
import { PhotoSlider } from "@/components/estate/PhotoSlider";
import { AUTO_BODY_TYPES, AUTO_TRANSMISSIONS, AUTO_FUELS, autoIcon, autoLabel, formatMiles } from "@/lib/auto";
import { formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import type { AutoCardRow } from "@/lib/auto-data";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function AutoCard({
  locale,
  dict,
  listing,
  footer,
  variant = "grid",
}: {
  locale: Locale;
  dict: Dictionary;
  listing: AutoCardRow;
  footer?: React.ReactNode;
  variant?: "grid" | "list";
}) {
  const t = dict.auto;
  const l = listing;
  const href = `/${locale}/auto/${l.slug}`;
  const location = [l.city, stateLabel(l.state, locale)].filter(Boolean).join(", ");
  const facts = [
    l.mileage != null && `🛣 ${formatMiles(l.mileage)}`,
    l.transmission && autoLabel(AUTO_TRANSMISSIONS, l.transmission, locale),
    l.fuel && autoLabel(AUTO_FUELS, l.fuel, locale),
  ].filter(Boolean) as string[];
  const inactive = l.status !== "ACTIVE";

  return (
    <div className={`mk-card${variant === "list" ? " mk-card-list" : ""}${inactive ? " mk-card-inactive" : ""}`}>
      <div className="mk-card-media">
        <PhotoSlider photos={l.photos} href={href} alt={l.title} placeholder={autoIcon(AUTO_BODY_TYPES, l.bodyType)} />
        <span className={`mk-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"} auto-kind-badge`}>
          {l.kind === "RENT" ? t.forRent : t.forSale}
        </span>
        {l.status === "SOLD" && <span className="mk-badge mk-badge-sold auto-status-badge">{l.kind === "RENT" ? t.rentedOut : t.sold}</span>}
        {l.status === "PAUSED" && <span className="mk-badge mk-badge-paused auto-status-badge">{dict.market.paused}</span>}
        {l.status === "REMOVED" && <span className="mk-badge mk-badge-sold auto-status-badge">{dict.market.removed}</span>}
      </div>
      <Link href={href} className="mk-card-body">
        <div className="mk-card-price">
          {formatPrice(l.price)}
          {l.kind === "RENT" && <span className="re-card-permo">{t.perDay}</span>}
          {l.negotiable && <span className="mk-card-obo">{dict.market.negotiableShort}</span>}
        </div>
        <h3 className="mk-card-title">{l.title}</h3>
        {facts.length > 0 && <div className="re-card-facts">{facts.join(" · ")}</div>}
        <div className="mk-card-meta">
          {l.bodyType && <span>{autoIcon(AUTO_BODY_TYPES, l.bodyType)} {autoLabel(AUTO_BODY_TYPES, l.bodyType, locale)}</span>}
          {l.kind === "RENT" && l.insured && (
            <>
              {l.bodyType && <span className="sep">·</span>}
              <span className="auto-insured">🛡️ {t.insuredShort}</span>
            </>
          )}
        </div>
        <div className="mk-card-meta">
          {location && <span>📍 {location}</span>}
          {l.distance !== undefined && (
            <>
              {location && <span className="sep">·</span>}
              <span className="mk-distance">{dict.market.away.replace("{n}", l.distance.toFixed(l.distance < 10 ? 1 : 0))}</span>
            </>
          )}
        </div>
      </Link>
      {footer && <div className="mk-card-footer">{footer}</div>}
    </div>
  );
}
