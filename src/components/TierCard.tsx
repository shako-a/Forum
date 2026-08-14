import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { PublicPackage } from "@/lib/packages";
import { formatPrice } from "@/lib/tiers";

// One paid package rendered as a card. Used on the hub (/[lang]/more) for all
// packages side by side, and at the top of each package's own page.
//
// Everything shown — copy, perks, price, discount — comes from the database, so
// an admin editing a package changes both places at once.
export function TierCard({
  pkg,
  locale,
  dict,
  held,
  showCta = true,
}: {
  pkg: PublicPackage;
  locale: Locale;
  dict: Dictionary;
  /** Viewer already has this package. */
  held: boolean;
  /** Detail pages render their own CTA, so they hide this one. */
  showCta?: boolean;
}) {
  const t = dict.tiers;
  const discounted = !!pkg.discount;

  return (
    <div
      className={`tier-card${pkg.featured ? " featured" : ""}${held ? " held" : ""}`}
      style={{ "--tier": pkg.accent } as React.CSSProperties}
    >
      {pkg.featured && <span className="tier-flag">{t.popular}</span>}

      <div className="tier-head">
        <span className="tier-icon" aria-hidden="true">
          {pkg.icon}
        </span>
        <h3 className="tier-name">{pkg.name}</h3>
      </div>

      <p className="tier-price">
        {/* While a promo runs, the list price stays visible struck through so
            the saving is legible rather than just a lower number. */}
        {discounted && <s className="tier-price-was">{formatPrice(pkg.priceCents)}</s>}
        <strong>{formatPrice(pkg.effectiveCents)}</strong>
        <span className="tier-per">{t.perMonth}</span>
      </p>
      {discounted && (
        <p className="tier-deal">
          <span className="tier-deal-badge">−{pkg.discount!.percentOff}%</span>
          {pkg.discount!.endsAt && (
            <span className="tier-deal-until">
              {t.dealUntil} {pkg.discount!.endsAt.toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US", { day: "numeric", month: "short" })}
            </span>
          )}
        </p>
      )}

      <p className="tier-blurb">{pkg.blurb}</p>

      <ul className="tier-perks">
        {pkg.perks.map((perk) => (
          <li key={perk.key} className={perk.included ? undefined : "tier-perk-off"}>
            <span className="tier-tick" aria-hidden="true">
              {perk.included ? "✓" : "✕"}
            </span>
            {perk.name}
          </li>
        ))}
      </ul>

      {showCta &&
        (held ? (
          <p className="tier-held">✓ {t.youHaveThis}</p>
        ) : (
          <Link
            href={`/${locale}/more/${pkg.slug}`}
            className="btn btn-primary btn-full tier-cta"
          >
            {t.learnMore}
          </Link>
        ))}
    </div>
  );
}
