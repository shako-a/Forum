import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import { adTitle } from "@/i18n/localize";
import type { Category, AdCard } from "@/generated/prisma/client";

// Right sidebar: recommendations + popular communities (categories) + sidebar ads.
export function RightSidebar({
  locale,
  dict,
  categories,
  ads,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Category[];
  ads: AdCard[];
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 p-3 lg:flex">
      <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
        <h2 className="mb-2 text-sm font-semibold opacity-70">
          {dict.home.popularCommunities}
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {categories.slice(0, 6).map((c) => (
            <li key={c.id} className="flex items-center justify-between">
              <span>{categoryName(c, locale)}</span>
              {c.locked && <span className="opacity-50">🔒</span>}
            </li>
          ))}
          {categories.length === 0 && (
            <li className="opacity-50">{dict.common.loading}</li>
          )}
        </ul>
      </div>

      {ads.length > 0 && (
        <div className="flex flex-col gap-3">
          {ads.map((ad) => (
            <a
              key={ad.id}
              href={ad.linkUrl ?? "#"}
              className="rounded-lg border border-black/10 dark:border-white/10 p-3 text-sm font-medium"
            >
              {adTitle(ad, locale)}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
