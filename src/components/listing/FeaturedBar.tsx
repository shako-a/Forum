import Link from "@/components/Link";
import type { FeaturedCard } from "@/lib/featured";
import type { Locale } from "@/i18n/config";

// The strip at the foot of a module's detail page — admin-curated in
// Admin → Featured. Renders nothing when the module has no featured rows,
// so a fresh module doesn't show an empty band.
export function FeaturedBar({
  cards,
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel,
  locale,
}: {
  cards: FeaturedCard[];
  eyebrow: string;
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  locale: Locale;
}) {
  if (cards.length === 0) return null;
  return (
    <section className="card fb" aria-label={title}>
      <div className="fb-head">
        <div>
          <p className="fb-eyebrow">{eyebrow}</p>
          <h2 className="fb-title">{title}</h2>
        </div>
        <Link href={viewAllHref} className="btn btn-ghost btn-sm">
          {viewAllLabel} →
        </Link>
      </div>
      <div className="fb-row">
        {cards.map((c) => (
          <Link key={c.id} href={`/${locale}${c.href}`} className="fb-card">
            <div className="fb-media">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" loading="lazy" />
              ) : (
                <span className="fb-placeholder" aria-hidden="true">{c.icon}</span>
              )}
              <span className="fb-badge">TOP</span>
            </div>
            <div className="fb-body">
              <p className="fb-sub">{c.subtitle}</p>
              <h3 className="fb-name">{c.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
