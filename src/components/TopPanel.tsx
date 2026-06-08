import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { adTitle } from "@/i18n/localize";
import type { AdCard } from "@/generated/prisma/client";

// Top panel: a horizontal strip of cards — popular topics + admin-managed ad cards.
export function TopPanel({
  locale,
  dict,
  ads,
}: {
  locale: Locale;
  dict: Dictionary;
  ads: AdCard[];
}) {
  const placeholders = ads.length === 0;

  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold opacity-70">{dict.home.popularTopics}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {placeholders
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex h-28 items-end rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-3 text-sm opacity-50"
              >
                {dict.home.popularTopics}
              </div>
            ))
          : ads.map((ad) => (
              <a
                key={ad.id}
                href={ad.linkUrl ?? "#"}
                className="flex h-28 items-end rounded-lg border border-black/10 dark:border-white/10 bg-cover bg-center p-3 text-sm font-medium"
                style={ad.imageUrl ? { backgroundImage: `url(${ad.imageUrl})` } : undefined}
              >
                {adTitle(ad, locale)}
              </a>
            ))}
      </div>
    </section>
  );
}
