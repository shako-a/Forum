import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { getCurrentUser } from "@/lib/dal";
import { MobileSidebar } from "@/components/MobileSidebar";
import { NavLink } from "@/components/NavLink";
import type { Category } from "@/generated/prisma/client";

export async function LeftSidebar({
  locale,
  dict,
  categories,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  const nav = dict.nav;
  // Locked communities show a 🔒 to guests only; registered members can open
  // them, so the lock is hidden once signed in.
  const authed = !!(await getCurrentUser());

  // Built once, rendered twice: as the desktop column and inside the mobile
  // drawer. (display:none at ≤1080 hides the column; the drawer overrides it.)
  const items = (
    <nav className="sidenav" aria-label="Main">
      <NavLink href={`/${locale}`} exact>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
        {nav.home}
      </NavLink>
      <NavLink href={`/${locale}/popular`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.7-2.5-.7-2.5S17 11 17 14a5 5 0 01-10 0c0-5 5-7 5-11z" />
        </svg>
        {nav.popular}
      </NavLink>
      <NavLink href={`/${locale}/news`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
        {nav.news}
      </NavLink>
      <NavLink href={`/${locale}/business`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h18M5 9V5h14v4M4 9v11h16V9M9 13h6" />
        </svg>
        {nav.directory}
      </NavLink>
      <NavLink href={`/${locale}/jobs`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16v13H4zM9 7V4h6v3" />
        </svg>
        {nav.jobs}
      </NavLink>

      <div className="group-label">{nav.communities}</div>
      {categories.map((c) => {
        const style = categoryStyle(c.slug);
        return (
          <NavLink key={c.id} href={`/${locale}/c/${c.slug}`}>
            <span className="dot" style={{ background: style.color }} />
            {categoryName(c, locale)}
            {c.locked && !authed && <span className="lock">🔒</span>}
          </NavLink>
        );
      })}

      <div className="group-label">{nav.resources}</div>
      <a href="#" className="nav-item">{nav.communityRules}</a>
    </nav>
  );

  return (
    <>
      {items}
      <MobileSidebar label={dict.common.menu}>{items}</MobileSidebar>
    </>
  );
}
