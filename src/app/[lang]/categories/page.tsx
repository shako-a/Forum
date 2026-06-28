import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { getCategoriesIndex } from "@/lib/forum-data";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = toHeaderUser(user);
  const categories = await getCategoriesIndex(Boolean(user));

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={categories} />

        <main className="feed">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>
            {dict.categories.title}
          </h1>

          {categories.map((c) => {
            const style = categoryStyle(c.slug);
            const gated = c.locked && !user;
            return (
              <div key={c.id} className="card card-pad">
                {/* Category header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                  <span
                    className="comm-icon"
                    style={{ background: `${style.color}1f`, color: style.color }}
                  >
                    {style.icon}
                  </span>
                  <Link
                    href={`/${lang}/c/${c.slug}`}
                    style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}
                  >
                    {categoryName(c, lang)}
                  </Link>
                  {c.locked && !user && <span className="lock">🔒</span>}
                  <Link href={`/${lang}/c/${c.slug}`} style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600 }}>
                    {dict.common.seeAll}
                  </Link>
                </div>

                {/* 3 most recently discussed posts, or gated notice */}
                {gated ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>
                    🔒 {dict.categories.membersOnly} —{" "}
                    <Link href={`/${lang}/login?next=/${lang}/c/${c.slug}`}>
                      {dict.categories.loginToView}
                    </Link>
                  </p>
                ) : c.posts.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>{dict.home.feedEmpty}</p>
                ) : (
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                    {c.posts.map((p) => (
                      <li key={p.id} style={{ fontSize: 13.5 }}>
                        <Link href={`/${lang}/p/${p.slug}`}>{p.title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </main>

        <RightSidebar locale={lang} dict={dict} user={headerUser} categories={categories} ads={[]} />
      </div>
    </>
  );
}
