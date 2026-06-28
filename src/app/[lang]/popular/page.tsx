import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { getFeedPage } from "@/lib/forum-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PostList } from "@/components/PostList";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function PopularPage({ params }: PageProps<"/[lang]/popular">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const { categories, posts, sidebarAds } = await getFeedPage(user ? { id: user.id } : null, "popular");
  const headerUser = toHeaderUser(user);

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={categories} />
        <div className="center-col">
          <h1 className="feed-page-title">🔥 {dict.nav.popular}</h1>
          <PostList
            locale={lang}
            dict={dict}
            posts={posts}
            canVote={!!user}
            loginHref={`/${lang}/login`}
          />
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
