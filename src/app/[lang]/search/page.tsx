import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { searchAll, type ListingHit } from "@/lib/search";
import { stateLabel } from "@/lib/us-states";
import { formatPrice } from "@/lib/estate";
import { MODULES, MODULE_META, listingPath, moduleLabel } from "@/lib/modules";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PostList } from "@/components/PostList";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#d7263d", "#1f4e9c", "#2e8b57", "#b8860b", "#6a3d9c", "#0d8a8a"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = toHeaderUser(user);
  const [categories, sidebarAds, results] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.adCard.findMany({ where: { active: true, placement: "SIDEBAR" }, orderBy: { sortOrder: "asc" } }),
    searchAll(q, user ? { id: user.id } : null),
  ]);
  const t = dict.search;
  const ready = q.length >= 2;
  const listingTotal = MODULES.reduce((n, m) => n + results.listings[m].length, 0);
  const total = results.posts.length + results.members.length + listingTotal;
  const nothing = ready && total === 0;

  const suffix = (h: ListingHit) =>
    h.priceSuffix === "month" ? dict.estate.perMonth : h.priceSuffix === "day" ? dict.auto.perDay : "";

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} searchQuery={q} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={categories} />
        <div className="center-col">
          <div className="search-head">
            <h1 className="feed-page-title">{t.title}</h1>
            {ready && <span className="search-count">{t.results.replace("{n}", String(total)).replace("{q}", q)}</span>}
          </div>

          {/* The header already has the search box, but on phones it is
              hidden — repeat it here as a plain form. */}
          <form method="get" action={`/${lang}/search`} className="search-form card card-pad">
            <input className="input" type="search" name="q" defaultValue={q} placeholder={t.placeholder} maxLength={100} autoFocus />
            <button type="submit" className="btn btn-primary">{t.submit}</button>
          </form>

          {q.length > 0 && !ready && <p className="search-note">{t.tooShort}</p>}
          {nothing && <div className="card card-pad search-empty">{t.noResults.replace("{q}", q)}</div>}

          {MODULES.map((m) => {
            const hits = results.listings[m];
            if (hits.length === 0) return null;
            return (
              <section key={m} className="search-section">
                <div className="eyebrow search-eyebrow">
                  {MODULE_META[m].icon} {moduleLabel(m, dict)} <span className="search-n">{hits.length}</span>
                </div>
                <div className="sr-grid">
                  {hits.map((h) => (
                    <Link key={h.key} href={`/${lang}${listingPath(m, h.key)}`} className="sr-card">
                      <span className="sr-thumb" aria-hidden="true">
                        {h.image ? <img src={h.image} alt="" /> : <span className="sr-icon">{h.icon}</span>}
                      </span>
                      <span className="sr-body">
                        <b className="sr-title">{h.title}</b>
                        {h.sub && <span className="sr-sub">{h.sub}</span>}
                        <span className="sr-meta">
                          {h.price !== null && (
                            <span className="sr-price">
                              {formatPrice(h.price)}
                              {suffix(h) && <small>{suffix(h)}</small>}
                            </span>
                          )}
                          {h.place && <span>📍 {h.place}</span>}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {results.members.length > 0 && (
            <section className="search-section">
              <div className="eyebrow search-eyebrow">
                👤 {t.members} <span className="search-n">{results.members.length}</span>
              </div>
              <div className="member-grid">
                {results.members.map((m) => (
                  <Link key={m.forumName} href={`/${lang}/u/${encodeURIComponent(m.forumName)}`} className="member-card">
                    <span className="member-avatar" style={{ background: avatarColor(m.forumName) }} aria-hidden="true">
                      {m.forumName.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <b>{m.forumName}</b>
                      <small>{[m.city, stateLabel(m.state, lang)].filter(Boolean).join(", ")}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {ready && results.posts.length > 0 && (
            <section className="search-section">
              <div className="eyebrow search-eyebrow">
                💬 {t.threads} <span className="search-n">{results.posts.length}</span>
              </div>
              <div className="feed">
                <PostList
                  locale={lang}
                  dict={dict}
                  posts={results.posts}
                  canVote={!!user}
                  loginHref={`/${lang}/login`}
                  canDelete={user?.role === "ADMIN"}
                />
              </div>
            </section>
          )}
        </div>
        <RightSidebar locale={lang} dict={dict} user={headerUser} categories={categories} ads={sidebarAds} />
      </div>
      <BottomNav locale={lang} dict={dict} user={headerUser} />
    </>
  );
}
