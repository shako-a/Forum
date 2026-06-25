import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyBusinesses, avgRating } from "@/lib/business-data";
import { canRegisterBusiness } from "@/lib/perks";
import { businessCategoryLabel } from "@/lib/business-categories";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Stars } from "@/components/business/Stars";

export const dynamic = "force-dynamic";

export default async function MyBusinessesPage({ params }: PageProps<"/[lang]/business/mine">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, businesses] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyBusinesses(user.id),
  ]);
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">{t.myBusinesses}</h1>
              <p className="account-sub">{t.myBusinessesSub}</p>
            </div>
            {canRegisterBusiness(user) && (
              <Link href={`/${lang}/business/new`} className="btn btn-primary">＋ {t.register}</Link>
            )}
          </div>

          {businesses.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noBusinesses}
            </div>
          ) : (
            <div className="biz-grid">
              {businesses.map((b) => (
                <div key={b.id} className="biz-card biz-card-mine">
                  <div className="biz-card-body">
                    <h3 className="biz-card-name">
                      {b.name}
                      {b.verified && <span className="biz-verified" title={t.verified}>✓</span>}
                      {b.featured && <span className="biz-featured">★</span>}
                    </h3>
                    <div className="biz-card-meta">
                      <span>{businessCategoryLabel(b.category, lang)}</span>
                      <span className="sep">·</span>
                      <span>{b._count.reviews} {t.reviews.toLowerCase()}</span>
                      <span className="sep">·</span>
                      <span>{b._count.jobs} {t.jobs.toLowerCase()}</span>
                    </div>
                    <Stars value={avgRating(b)} count={b.ratingCount} />
                    <div className="biz-card-actions">
                      <Link href={`/${lang}/business/${b.slug}`} className="btn btn-ghost btn-sm">{t.view}</Link>
                      <Link href={`/${lang}/business/${b.slug}/edit`} className="btn btn-ghost btn-sm">{t.manage}</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
