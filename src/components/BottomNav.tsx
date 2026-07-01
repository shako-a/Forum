import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { getInboxUnread } from "@/lib/inbox-data";
import { NavLink } from "@/components/NavLink";

// Mobile-only bottom navigation (shown under 840px via CSS).
export async function BottomNav({
  locale,
  dict,
  user,
}: {
  locale: Locale;
  dict: Dictionary;
  user: { forumName: string } | null;
}) {
  const t = dict.bottomNav;
  const unread = user ? (await getInboxUnread()).total : 0;
  return (
    <nav className="bottom-nav" aria-label="Mobile">
      <div className="row">
        <NavLink href={`/${locale}`} exact className="bnav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
          </svg>
          {t.home}
        </NavLink>
        <NavLink href={`/${locale}/search`} className="bnav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          {t.search}
        </NavLink>
        <Link href={user ? `/${locale}/create` : `/${locale}/login`} className="bnav-item" aria-label={t.create}>
          <span className="fab">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </Link>
        <NavLink href={user ? `/${locale}/inbox` : `/${locale}/login`} className="bnav-item bnav-inbox">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z" />
          </svg>
          {unread > 0 && <span className="nav-badge bnav-badge">{unread > 99 ? "99+" : unread}</span>}
          {t.inbox}
        </NavLink>
        <NavLink href={user ? `/${locale}/u/${user.forumName}` : `/${locale}/login`} className="bnav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
          </svg>
          {t.profile}
        </NavLink>
      </div>
    </nav>
  );
}
