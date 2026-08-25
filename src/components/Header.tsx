import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerifyBanner } from "@/components/VerifyBanner";
import { UserTheme } from "@/components/UserTheme";
import { ProfileMenu } from "@/components/ProfileMenu";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { HeaderUser } from "@/lib/header-user";
import { hasAiAccess } from "@/lib/perks";
import { getInboxUnread } from "@/lib/inbox-data";
import { getManageableBusinesses } from "@/lib/business-manage";
import { recordVisit } from "@/lib/visitors";
import { getActingBusiness } from "@/lib/acting-as";

export async function Header({
  locale,
  dict,
  user,
}: {
  locale: Locale;
  dict: Dictionary;
  user: HeaderUser;
}) {
  // Every user-facing page renders the header, so this is where the
  // cookieless visitor counter ticks (deduplicated per visitor per day).
  await recordVisit();
  const t = dict.common;
  const unread = user ? (await getInboxUnread()).total : 0;
  // Businesses this user can act as, and which one is active (if any).
  const [manageable, acting] = user
    ? await Promise.all([getManageableBusinesses(user.id), getActingBusiness()])
    : [[], null];
  // "Ask AI" is a paid perk (Donor or Professional). Guests → login; logged-in
  // users without a paid tier → the upgrade page; paid → the Ask AI feature.
  const aiAccess = hasAiAccess(user);
  const askAiHref = !user
    ? `/${locale}/login?next=/${locale}/ask`
    : aiAccess
      ? `/${locale}/ask`
      : `/${locale}/donate`;
  const askAiLocked = !aiAccess;
  // Admin-panel button: admins always; moderators only when granted; never for
  // plain users or guests.
  const showAdmin =
    !!user && (user.role === "ADMIN" || (user.role === "MODERATOR" && user.canAccessAdmin));
  return (
    <>
      {/* User appearance overrides. Header renders on every user-facing page
          with the user already loaded, so this costs no extra query. */}
      <UserTheme prefs={user?.prefs ?? null} />
      {user && !user.emailVerified && (
        <VerifyBanner
          locale={locale}
          text={dict.auth.bannerText}
          cta={dict.auth.bannerCta}
          dismissLabel={dict.auth.bannerDismiss}
        />
      )}
      <header className="header">
      {/* Logo */}
      <Link className="logo" href={`/${locale}`} aria-label={`${t.appName} home`}>
        <span className="logo-mark" aria-hidden="true">
          {/* Bolnisi-style cross */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v16M4 12h16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
            <path
              d="M6 6.5h2M16 6.5h2M6 17.5h2M16 17.5h2"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity=".85"
            />
          </svg>
        </span>
        <span className="logo-text">
          <span className="word">
            Geo<span className="ge">Globally</span>
          </span>
          <span className="logo-sub word">{t.tagline}</span>
        </span>
      </Link>

      {/* Search */}
      <div className="search" role="search">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input type="text" placeholder={t.search} />
      </div>

      <div className="header-actions">
        <Link
          href={askAiHref}
          className={`ask-ai${askAiLocked ? " ask-ai-locked" : ""}`}
          title={askAiLocked ? t.askAiDonorOnly : undefined}
        >
          <span className="spark">✦</span> <span className="ask-ai-text">{t.askAi}</span>
          {askAiLocked && <span className="ask-ai-lock" aria-hidden="true">🔒</span>}
        </Link>

        <ThemeToggle label={t.toggleTheme} />

        <LanguageSwitcher current={locale} />

        {user ? (
          <>
            {showAdmin && (
              <Link href={`/${locale}/admin`} className="btn btn-ghost header-admin">
                <span aria-hidden="true">🛡</span> <span className="header-admin-text">{t.admin}</span>
              </Link>
            )}
            <Link
              href={`/${locale}/inbox`}
              className="header-inbox"
              title={t.inbox}
              aria-label={t.inbox}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z" />
              </svg>
              {unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
            </Link>
            <Link href={`/${locale}/create`} className="btn btn-primary">
              {t.create}
            </Link>
            <ProfileMenu
              locale={locale}
              forumName={user.forumName}
              profileLabel={t.profile}
              logoutLabel={t.logout}
              businesses={manageable.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
              actingId={acting?.id ?? null}
              actingName={acting?.name ?? null}
              actingAsLabel={t.actingAs}
              selfLabel={t.you}
              myListingsLabel={t.myListings}
            />
          </>
        ) : (
          <>
            <Link href={`/${locale}/login`} className="btn btn-ghost login">
              {t.login}
            </Link>
            <Link href={`/${locale}/signup`} className="btn btn-primary">
              {t.register}
            </Link>
          </>
        )}
      </div>
      </header>
    </>
  );
}
