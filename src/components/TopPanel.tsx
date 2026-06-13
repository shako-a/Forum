import Link from "next/link";
import { categoryName, adTitle } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import type { FeedPost } from "@/components/PostList";
import type { AdCard } from "@/generated/prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Spec "Top panel — cards": a horizontal row of popular topics plus the
// admin-managed TOP_PANEL advertisement cards. Renders nothing when empty.
export function TopPanel({
  locale,
  dict,
  popular,
  ads,
}: {
  locale: Locale;
  dict: Dictionary;
  popular: FeedPost[];
  ads: AdCard[];
}) {
  if (popular.length === 0 && ads.length === 0) return null;

  return (
    <section className="top-panel" aria-label={dict.home.popularTopics}>
      <div className="top-panel-head">
        <h3>{dict.home.popularTopics}</h3>
      </div>
      <div className="hscroll">
        {popular.map((p) => {
          const style = categoryStyle(p.category.slug);
          return (
            <Link key={p.id} href={`/${locale}/p/${p.slug}`} className="pop-card">
              <span className="pop-cat" style={{ color: style.color }}>
                <span className="dot" style={{ background: style.color }} />
                {categoryName(p.category, locale)}
              </span>
              <span className="pop-title">{p.title}</span>
              <span className="pop-meta">
                ▲ {p.score} · {p._count.replies} {dict.home.comments}
              </span>
            </Link>
          );
        })}

        {ads.map((ad) => {
          const cls = `pop-card ad-card-top${ad.imageUrl ? " ad-has-image" : ""}`;
          const inner = (
            <>
              {ad.imageUrl && (
                <span
                  className="ad-img-full"
                  style={{ backgroundImage: `url(${ad.imageUrl})` }}
                  aria-hidden="true"
                />
              )}
              <span className="ad-overlay-title" style={{ color: ad.titleColor }}>
                {adTitle(ad, locale)}
              </span>
            </>
          );
          return ad.linkUrl ? (
            <a key={ad.id} href={ad.linkUrl} target="_blank" rel="noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <div key={ad.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
