import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getBusinessDirectory, avgRating } from "@/lib/business-data";
import { canPostIn } from "@/lib/posting-access";
import {
  BUSINESS_CATEGORIES,
  businessCategoryLabel,
  businessCategoryIcon,
} from "@/lib/business-categories";
import { stateLabel } from "@/lib/us-states";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Stars } from "@/components/business/Stars";

export const dynamic = "force-dynamic";

export default async function BusinessDirectoryPage({
  params,
  searchParams,
}: PageProps<"/[lang]/business">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  const [dict, user, allCategories, businesses] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getBusinessDirectory({ q, category }),
  ]);
  const t = dict.business;
  // Registering is open to every signed-in member (Admin → More can narrow it
  // to perk holders). Guests don't see the button — there is nothing they
  // could do with it.
  const canRegister = await canPostIn("business", user);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">{t.directory}</h1>
              <p className="account-sub">{t.directorySub}</p>
            </div>
            {canRegister && (
              <Link href={`/${lang}/business/new`} className="btn btn-primary">＋ {t.register}</Link>
            )}
          </div>

          <form className="biz-filters" action={`/${lang}/business`} method="get">
            <input className="input" name="q" placeholder={t.searchPlaceholder} defaultValue={q ?? ""} />
            <select className="input" name="category" defaultValue={category ?? ""}>
              <option value="">{t.allCategories}</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {lang === "ka" ? c.ka : c.en}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost">{t.search}</button>
          </form>

          {businesses.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.directoryEmpty}
            </div>
          ) : (
            <div className="biz-grid">
              {businesses.map((b) => (
                <Link key={b.id} href={`/${lang}/business/${b.slug}`} className="biz-card">
                  <div className="biz-card-logo" aria-hidden="true">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logoUrl} alt="" />
                    ) : (
                      <span>{businessCategoryIcon(b.category)}</span>
                    )}
                  </div>
                  <div className="biz-card-body">
                    <h3 className="biz-card-name">
                      {b.name}
                      {b.verified && <span className="biz-verified" title={t.verified}>✓</span>}
                      {b.featured && <span className="biz-featured">★ {t.featured}</span>}
                    </h3>
                    {b.tagline && <p className="biz-card-tagline">{b.tagline}</p>}
                    <div className="biz-card-meta">
                      <span>{businessCategoryLabel(b.category, lang)}</span>
                      <span className="sep">·</span>
                      <span>{[b.city, stateLabel(b.state, lang)].filter(Boolean).join(", ")}</span>
                    </div>
                    <Stars value={avgRating(b)} count={b.ratingCount} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
