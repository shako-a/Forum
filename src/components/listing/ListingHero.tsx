// The card under the title: media on the left; badge, category line, blurb
// and the action buttons on the right. Stacks on a phone.
export function ListingHero({
  media,
  badge,
  category,
  blurb,
  actions,
  manage,
}: {
  media: React.ReactNode;
  badge?: string | null;
  category?: React.ReactNode;
  blurb?: React.ReactNode;
  actions: React.ReactNode;
  manage?: React.ReactNode;
}) {
  return (
    <div className="card listing-hero">
      <div className="listing-hero-media">{media}</div>
      <div className="listing-hero-info">
        {(badge || manage) && (
          <div className="listing-hero-top">
            {badge && <span className="listing-badge">{badge}</span>}
            {manage && <span className="listing-hero-manage">{manage}</span>}
          </div>
        )}
        {category && <div className="listing-category">{category}</div>}
        {blurb && <div className="listing-blurb">{blurb}</div>}
        {actions}
      </div>
    </div>
  );
}
