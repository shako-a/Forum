import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyListings } from "@/lib/estate-data";
import { canPostIn } from "@/lib/posting-access";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ListingCard } from "@/components/estate/ListingCard";

export const dynamic = "force-dynamic";

export default async function MyListingsPage({ params }: PageProps<"/[lang]/realestate/mine">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, listings] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyListings(user.id),
  ]);
  const t = dict.estate;
  const canPost = await canPostIn("estate", user);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">{t.myListings}</h1>
              <p className="account-sub">{t.myListingsSub}</p>
            </div>
            {canPost && (
              <Link href={`/${lang}/realestate/new`} className="btn btn-primary">＋ {t.post}</Link>
            )}
          </div>

          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noneYet}
            </div>
          ) : (
            <div className="re-grid">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  locale={lang}
                  dict={dict}
                  listing={l}
                  footer={
                    <Link href={`/${lang}/realestate/${l.slug}/edit`} className="btn btn-ghost btn-sm">
                      ✏️ {dict.business.manage}
                    </Link>
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
