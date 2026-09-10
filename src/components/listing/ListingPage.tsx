import Link from "@/components/Link";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import type { HeaderUser } from "@/lib/header-user";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Category } from "@/generated/prisma/client";

export type ListingMetaItem = { icon: string; node: React.ReactNode };

// The shared detail-page frame for the marketplace modules.
//
//   title + meta row
//   hero (media | facts + actions)
//   main (2/3)             rail (1/3)
//   similar · featured bar
//
// Uses the wide shell (no right rail column of the forum's own) so the two
// columns get the full width the reference layout needs.
export function ListingPage({
  locale,
  dict,
  user,
  categories,
  back,
  title,
  meta,
  banners,
  hero,
  main,
  rail,
  after,
}: {
  locale: Locale;
  dict: Dictionary;
  user: HeaderUser;
  categories: Category[];
  back?: { href: string; label: string };
  title: React.ReactNode;
  meta?: ListingMetaItem[];
  banners?: React.ReactNode;
  hero: React.ReactNode;
  main: React.ReactNode;
  rail: React.ReactNode;
  after?: React.ReactNode;
}) {
  return (
    <>
      <Header locale={locale} dict={dict} user={user} />
      <div className="shell shell-wide">
        <LeftSidebar locale={locale} dict={dict} categories={categories} />
        <main className="feed listing">
          {back && (
            <Link href={back.href} className="btn btn-ghost btn-sm biz-back">
              ‹ {back.label}
            </Link>
          )}
          {banners}
          <header className="listing-head">
            <h1 className="listing-title">{title}</h1>
            {meta && meta.length > 0 && (
              <div className="listing-meta">
                {meta.map((m, i) => (
                  <span key={i} className="listing-meta-item">
                    <span aria-hidden="true">{m.icon}</span> {m.node}
                  </span>
                ))}
              </div>
            )}
          </header>
          {hero}
          <div className="listing-cols">
            <div className="listing-main">{main}</div>
            <aside className="listing-rail">{rail}</aside>
          </div>
          {after}
        </main>
      </div>
    </>
  );
}
