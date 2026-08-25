import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyMarketListings } from "@/lib/market-data";
import { canSellOnMarket } from "@/lib/perks";
import { canRenew, isMarketExpired } from "@/lib/market";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarketCard } from "@/components/market/MarketCard";
import { OwnerControls } from "@/components/market/OwnerControls";

export const dynamic = "force-dynamic";

export default async function MyMarketListingsPage({ params }: PageProps<"/[lang]/market/mine">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, listings] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyMarketListings(user.id),
  ]);
  const t = dict.market;

  const groups: Array<{ key: string; label: string; items: typeof listings }> = [
    { key: "active", label: t.statusActive, items: listings.filter((l) => l.status === "ACTIVE" && !isMarketExpired(l.bumpedAt)) },
    { key: "expired", label: t.statusExpired, items: listings.filter((l) => l.status === "ACTIVE" && isMarketExpired(l.bumpedAt)) },
    { key: "paused", label: t.statusPaused, items: listings.filter((l) => l.status === "PAUSED") },
    { key: "sold", label: t.statusSold, items: listings.filter((l) => l.status === "SOLD") },
  ];

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">{t.myListings}</h1>
              <p className="account-sub">{t.mineSub}</p>
            </div>
            <div className="mk-head-actions">
              <Link href={`/${lang}/market/saved`} className="btn btn-ghost btn-sm">♥ {t.savedItems}</Link>
              {canSellOnMarket(user) && (
                <Link href={`/${lang}/market/new`} className="btn btn-primary">＋ {t.sell}</Link>
              )}
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noneYet}
            </div>
          ) : (
            groups.map((g) =>
              g.items.length === 0 ? null : (
                <section key={g.key} className="biz-section">
                  <h2 className="biz-section-title" style={{ padding: "0 4px 8px" }}>
                    {g.label} <span className="muted-sm">· {g.items.length}</span>
                  </h2>
                  <div className="mk-grid">
                    {g.items.map((l) => (
                      <MarketCard
                        key={l.id}
                        locale={lang}
                        dict={dict}
                        listing={l}
                        viewerId={user.id}
                        footer={
                          <>
                            <div className="muted-sm mk-stats">
                              👁 {t.views.replace("{n}", String(l.views))} · ♥ {l._count.favorites}
                            </div>
                            <OwnerControls
                              locale={lang}
                              dict={dict}
                              listingId={l.id}
                              slug={l.slug}
                              status={l.status}
                              renewable={canRenew(l.bumpedAt)}
                              expired={g.key === "expired"}
                              compact
                            />
                          </>
                        }
                      />
                    ))}
                  </div>
                </section>
              ),
            )
          )}
        </main>
      </div>
    </>
  );
}
