import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { getHomeData } from "@/lib/forum-data";
import { aliasOptions } from "@/lib/anon";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { Feed } from "@/components/Feed";
import { TopPanel } from "@/components/TopPanel";
import { BottomNav } from "@/components/BottomNav";

// Per-request: depends on the viewer's session and live forum data.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const data = await getHomeData(user ? { id: user.id } : null);
  const headerUser = toHeaderUser(user);

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={data.categories} />
        <div className="center-col">
          <TopPanel locale={lang} dict={dict} popular={data.popular} ads={data.topAds} limit={data.barSize} />
          <Feed
            locale={lang}
            dict={dict}
            user={headerUser}
            posts={data.posts}
            aliases={user ? aliasOptions(user.id) : []}
            canDelete={user?.role === "ADMIN"}
          />
        </div>
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
