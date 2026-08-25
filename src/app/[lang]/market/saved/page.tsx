import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getSavedMarketListings } from "@/lib/market-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarketCard } from "@/components/market/MarketCard";

export const dynamic = "force-dynamic";

export default async function SavedMarketListingsPage({ params }: PageProps<"/[lang]/market/saved">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, listings] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getSavedMarketListings(user.id),
  ]);
  const t = dict.market;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">♥ {t.savedItems}</h1>
              <p className="account-sub">{t.savedSub}</p>
            </div>
            <Link href={`/${lang}/market`} className="btn btn-ghost btn-sm">‹ {t.directory}</Link>
          </div>
          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noSaved}
            </div>
          ) : (
            <div className="mk-grid">
              {listings.map((l) => (
                <MarketCard key={l.id} locale={lang} dict={dict} listing={l} viewerId={user.id} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
