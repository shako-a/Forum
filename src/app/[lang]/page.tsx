import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { getHomeData } from "@/lib/forum-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { Feed } from "@/components/Feed";
import { BottomNav } from "@/components/BottomNav";

// Per-request: depends on the viewer's session and live forum data.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const data = await getHomeData(user ? { id: user.id } : null);
  const headerUser = user ? { forumName: user.forumName } : null;

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={data.categories} />
        <Feed locale={lang} dict={dict} user={headerUser} posts={data.posts} />
        <RightSidebar
          locale={lang}
          dict={dict}
          user={headerUser}
          categories={data.categories}
          ads={data.sidebarAds}
        />
      </div>
      <BottomNav locale={lang} dict={dict} user={headerUser} />
    </>
  );
}
