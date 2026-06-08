import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { getHomeData } from "@/lib/forum-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { TopPanel } from "@/components/TopPanel";
import { Feed } from "@/components/Feed";

// Per-request: depends on the viewer's session and live forum data.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const data = await getHomeData(Boolean(user));

  return (
    <>
      <Header locale={lang} dict={dict} user={user} />
      <div className="flex flex-1">
        <LeftSidebar locale={lang} dict={dict} categories={data.categories} />
        <main className="min-w-0 flex-1 p-4">
          <TopPanel locale={lang} dict={dict} ads={data.topAds} />
          <Feed locale={lang} dict={dict} posts={data.posts} />
        </main>
        <RightSidebar
          locale={lang}
          dict={dict}
          categories={data.categories}
          ads={data.sidebarAds}
        />
      </div>
    </>
  );
}
