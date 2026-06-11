import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
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

  return (
    <nav className="sidenav" aria-label="Main">
      <Link href={`/${locale}`} className="nav-item active">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
        {nav.home}
      </Link>
      <Link href={`/${locale}/popular`} className="nav-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.7-2.5-.7-2.5S17 11 17 14a5 5 0 01-10 0c0-5 5-7 5-11z" />
        </svg>
        {nav.popular}
      </Link>
      <Link href={`/${locale}/news`} className="nav-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
        {nav.news}
      </Link>

      <div className="group-label">{nav.communities}</div>
      {categories.map((c) => {
        const style = categoryStyle(c.slug);
        return (
          <Link key={c.id} href={`/${locale}/c/${c.slug}`} className="nav-item">
            <span className="dot" style={{ background: style.color }} />
            {categoryName(c, locale)}
            {c.locked && <span className="lock">🔒</span>}
          </Link>
        );
      })}

      <div className="group-label">{nav.resources}</div>
      <a href="#" className="nav-item">{nav.newcomerGuide}</a>
      <a href="#" className="nav-item">{nav.immigrationGlossary}</a>
      <a href="#" className="nav-item">{nav.communityRules}</a>
    </nav>
  );
}
