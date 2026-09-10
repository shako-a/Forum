import Link from "@/components/Link";
import { PhotoSlider } from "@/components/estate/PhotoSlider";
import { Stars } from "@/components/business/Stars";
import { avgRating } from "@/lib/business-data";
import { businessCategoryIcon, businessCategoryLabel } from "@/lib/business-categories";
import { stateLabel } from "@/lib/us-states";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type BusinessCardData = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string;
  logoUrl: string | null;
  photos: string[];
  city: string | null;
  state: string;
  verified: boolean;
  featured: boolean;
  ratingCount: number;
  ratingSum: number;
};

// The directory card, as a component — the same markup business/page.tsx
// renders inline, so "similar businesses" match the directory exactly.
export function BusinessCard({ locale, dict, business: b }: { locale: Locale; dict: Dictionary; business: BusinessCardData }) {
  const t = dict.business;
  const href = `/${locale}/business/${b.slug}`;
  return (
    <div className={`biz-card biz-card-linked${b.photos.length > 0 ? " biz-card-cover" : ""}`}>
      {b.photos.length > 0 && (
        <div className="biz-card-media">
          <PhotoSlider photos={b.photos} href={href} alt={b.name} placeholder={businessCategoryIcon(b.category)} />
        </div>
      )}
      <Link href={href} className="biz-card-main">
        <div className="biz-card-logo" aria-hidden="true">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoUrl} alt="" />
          ) : (
            <span>{businessCategoryIcon(b.category)}</span>
          )}
        </div>
        <div className="biz-card-body">
          <h3 className="biz-card-name">
            {b.name}
            {b.verified && <span className="biz-verified" title={t.verified}>✓</span>}
            {b.featured && <span className="biz-featured">★ {t.featured}</span>}
          </h3>
          {b.tagline && <p className="biz-card-tagline">{b.tagline}</p>}
          <div className="biz-card-meta">
            <span>{businessCategoryLabel(b.category, locale)}</span>
            <span className="sep">·</span>
            <span>{[b.city, stateLabel(b.state, locale)].filter(Boolean).join(", ")}</span>
          </div>
          <Stars value={avgRating(b)} count={b.ratingCount} />
        </div>
      </Link>
    </div>
  );
}
