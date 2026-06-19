import Link from "next/link";
import { categoryName, adTitle } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import type { PopularTopic } from "@/lib/forum-data";
import type { AdCard } from "@/generated/prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Item = { kind: "post"; post: PopularTopic } | { kind: "ad"; ad: AdCard };

// Interleave popular topics with the admin-placed ad cards. Each ad's
// `sortOrder` is its 1-based position in the row (1 = first slot, 2 = second…);
// popular topics fill the remaining slots in order. Ads with sortOrder < 1 have
// no fixed slot and are appended after the topics. Two ads on the same slot
// keep their order, the later one shifting one slot down.
function buildItems(popular: PopularTopic[], ads: AdCard[]): Item[] {
  const positioned = ads.filter((a) => a.sortOrder >= 1).sort((a, b) => a.sortOrder - b.sortOrder);
  const trailing = ads.filter((a) => a.sortOrder < 1);

  const items: Item[] = [];
  const posts = [...popular];
  let ai = 0;
  let slot = 1;
  while (posts.length || ai < positioned.length) {
    if (ai < positioned.length && positioned[ai].sortOrder <= slot) {
      items.push({ kind: "ad", ad: positioned[ai] });
      ai++;
    } else if (posts.length) {
      items.push({ kind: "post", post: posts.shift()! });
    } else {
      items.push({ kind: "ad", ad: positioned[ai] });
      ai++;
    }
    slot++;
  }
  for (const ad of trailing) items.push({ kind: "ad", ad });
  return items;
}

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
  popular: PopularTopic[];
  ads: AdCard[];
}) {
  if (popular.length === 0 && ads.length === 0) return null;

  const items = buildItems(popular, ads);

  return (
    <section className="top-panel" aria-label={dict.home.popularTopics}>
      <div className="top-panel-head">
        <h3>{dict.home.popularTopics}</h3>
      </div>
      <div className="hscroll">
        {items.map((item) => {
          if (item.kind === "post") {
            const p = item.post;
            const style = categoryStyle(p.category.slug);
            // Locked-category topic shown to a guest: title is a teaser, but the
            // card routes to login instead of opening the gated post.
            const href = p.gated
              ? `/${locale}/login?next=/${locale}/p/${p.slug}`
              : `/${locale}/p/${p.slug}`;
            return (
              <Link
                key={`p-${p.id}`}
                href={href}
                className={`pop-card${p.gated ? " pop-card-locked" : ""}`}
              >
                <span className="pop-cat" style={{ color: style.color }}>
                  <span className="dot" style={{ background: style.color }} />
                  {categoryName(p.category, locale)}
                  {p.gated && <span className="pop-lock" aria-hidden="true">🔒</span>}
                </span>
                <span className="pop-title">{p.title}</span>
                {p.gated ? (
                  <span className="pop-meta pop-meta-locked">🔒 {dict.categories.membersOnly}</span>
                ) : (
                  <span className="pop-meta">
                    ▲ {p.score} · {p._count.replies} {dict.home.comments}
                  </span>
                )}
              </Link>
            );
          }

          const ad = item.ad;
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
            <a key={`ad-${ad.id}`} href={ad.linkUrl} target="_blank" rel="noreferrer" className={cls}>
              {inner}
            </a>
          ) : (
            <div key={`ad-${ad.id}`} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
