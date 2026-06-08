import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logout } from "@/app/actions/auth";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type HeaderUser = { forumName: string } | null;

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
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/10 dark:border-white/10 bg-background/90 px-4 py-2 backdrop-blur">
      {/* Logo */}
      <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
        {t.appName}
      </Link>

      {/* Search / Ask AI */}
      <div className="mx-auto flex w-full max-w-xl items-center gap-2">
        <input
          type="search"
          placeholder={t.search}
          className="w-full rounded-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
        <button
          type="button"
          className="shrink-0 rounded-full border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t.askAi}
        </button>
      </div>

      <LanguageSwitcher current={locale} />

      {/* Auth area */}
      {user ? (
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/create`}
            className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {t.create}
          </Link>
          <span className="hidden text-sm sm:inline">{user.forumName}</span>
          <form action={logout}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-full border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {t.logout}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/login`}
            className="rounded-full border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t.login}
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {t.register}
          </Link>
          {/* Website-only app download button */}
          <button
            type="button"
            className="hidden rounded-full border border-black/15 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 md:inline"
          >
            {t.downloadApp}
          </button>
        </div>
      )}
    </header>
  );
}
