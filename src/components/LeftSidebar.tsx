import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import type { Category } from "@/generated/prisma/client";

export function LeftSidebar({
  locale,
  dict,
  categories,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  const nav = dict.nav;
  const link = "block rounded-md px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-4 border-r border-black/10 dark:border-white/10 p-3 text-sm">
      {/* 2.1 Buttons */}
      <div className="flex flex-col">
        <Link href={`/${locale}`} className={link}>🏠 {nav.home}</Link>
        <Link href={`/${locale}/popular`} className={link}>🔥 {nav.popular}</Link>
        <Link href={`/${locale}/news`} className={link}>📰 {nav.news}</Link>
        <Link href={`/${locale}/categories`} className={link}>🗂 {nav.categories}</Link>
      </div>

      {/* Categories list */}
      <div>
        <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
          {nav.categories}
        </div>
        <div className="flex flex-col">
          {categories.map((c) => (
            <Link key={c.id} href={`/${locale}/c/${c.slug}`} className={link}>
              {categoryName(c, locale)}
              {c.locked && <span className="ml-1 opacity-50">🔒</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* 2.2 Resources */}
      <div>
        <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
          {nav.resources}
        </div>
      </div>

      {/* 2.4 Footer */}
      <div className="mt-auto px-3 pt-3 text-xs opacity-60">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>{dict.footer.about}</span>
          <span>{dict.footer.rules}</span>
          <span>{dict.footer.privacy}</span>
          <span>{dict.footer.terms}</span>
        </div>
      </div>
    </nav>
  );
}
