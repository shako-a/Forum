import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { HeaderUser } from "@/lib/header-user";

export function Header({
  locale,
  dict,
  user,
}: {
  locale: Locale;
  dict: Dictionary;
  user: HeaderUser;
}) {
  const t = dict.common;
  // "Ask AI" is a Donor perk. Guests → login; logged-in non-Donors → the Donor
  // upgrade page; Donors → the Ask AI feature.
  const askAiHref = !user
    ? `/${locale}/login?next=/${locale}/ask`
    : user.isDonor
      ? `/${locale}/ask`
      : `/${locale}/donate`;
  const askAiLocked = !user || !user.isDonor;
  // Admin-panel button: admins always; moderators only when granted; never for
  // plain users or guests.
  const showAdmin =
    !!user && (user.role === "ADMIN" || (user.role === "MODERATOR" && user.canAccessAdmin));
  return (
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
          <span className="spark">✦</span> {t.askAi}
          {askAiLocked && <span className="ask-ai-lock" aria-hidden="true">🔒</span>}
        </Link>

        <LanguageSwitcher current={locale} />

        {user ? (
          <>
            {showAdmin && (
              <Link href={`/${locale}/admin`} className="btn btn-ghost header-admin">
                <span aria-hidden="true">🛡</span> {t.admin}
              </Link>
            )}
            <Link href={`/${locale}/create`} className="btn btn-primary">
              {t.create}
            </Link>
            <Link
              href={`/${locale}/u/${user.forumName}`}
              className="header-profile"
              title={user.forumName}
            >
              <span className="header-avatar" aria-hidden="true">
                {user.forumName.charAt(0).toUpperCase()}
              </span>
              <span className="header-profile-name">{user.forumName}</span>
            </Link>
            <form action={logout}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-ghost login">
                {t.logout}
              </button>
            </form>
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
  );
}
