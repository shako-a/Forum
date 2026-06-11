import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getCategoryPage } from "@/lib/forum-data";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PostList } from "@/components/PostList";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: PageProps<"/[lang]/c/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = user ? { forumName: user.forumName } : null;

  const [allCategories, data] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getCategoryPage(slug, Boolean(user)),
  ]);
  if (!data) notFound();

  const { category, posts, gated } = data;
  const style = categoryStyle(category.slug);
  const description = lang === "ka" ? category.descriptionKa : category.descriptionEn;

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />

        <main className="feed">
          {/* Category header */}
          <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              className="comm-icon"
              style={{ width: 44, height: 44, fontSize: 20, background: `${style.color}1f`, color: style.color }}
            >
              {style.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
                {categoryName(category, lang)}
                {category.locked && <span className="lock" style={{ marginLeft: 8 }}>🔒</span>}
              </h1>
              {description && <p style={{ fontSize: 13, color: "var(--muted)" }}>{description}</p>}
            </div>
            {user && (
              <Link href={`/${lang}/create?category=${category.slug}`} className="btn btn-primary">
                {dict.home.createPost}
              </Link>
            )}
          </div>

          {/* Gated (locked + guest) vs. post list */}
          {gated ? (
            <div className="card card-pad" style={{ textAlign: "center", padding: 36 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 6 }}>
                {dict.categories.membersOnly}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
                {dict.categories.lockedNotice}
              </p>
              <Link href={`/${lang}/login?next=/${lang}/c/${category.slug}`} className="btn btn-primary">
                {dict.categories.loginToView}
              </Link>
            </div>
          ) : (
            <PostList locale={lang} dict={dict} posts={posts} />
          )}
        </main>

        <RightSidebar locale={lang} dict={dict} user={headerUser} categories={allCategories} ads={[]} />
      </div>
    </>
  );
}
