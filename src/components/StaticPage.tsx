import { toHeaderUser } from "@/lib/header-user";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { BottomNav } from "@/components/BottomNav";

type FooterKey = Extract<keyof Dictionary["footer"], "about" | "rules" | "moderators" | "privacy" | "contact">;

// Shared shell for the footer info pages — renders the title with a
// "coming soon" notice inside the normal site layout.
export async function StaticPage({ lang, titleKey }: { lang: Locale; titleKey: FooterKey }) {
  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const [categories, sidebarAds] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.adCard
      .findMany({ where: { active: true, placement: "SIDEBAR" }, orderBy: { sortOrder: "asc" } })
      .catch(() => []),
  ]);
  const headerUser = toHeaderUser(user);
  const title = dict.footer[titleKey];

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={categories} />
        <div className="center-col">
          <h1 className="feed-page-title">{title}</h1>
          <div className="card card-pad coming-soon">
            <div className="coming-soon-ico" aria-hidden="true">🚧</div>
            <h2 className="coming-soon-title">{dict.common.comingSoon}</h2>
            <p className="coming-soon-text">{dict.common.comingSoonBody}</p>
          </div>
        </div>
        <RightSidebar
          locale={lang}
          dict={dict}
          user={headerUser}
          categories={categories}
          ads={sidebarAds}
        />
      </div>
      <BottomNav locale={lang} dict={dict} user={headerUser} />
    </>
  );
}
