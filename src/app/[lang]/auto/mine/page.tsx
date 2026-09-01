import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyAutoListings } from "@/lib/auto-data";
import { canPostIn } from "@/lib/posting-access";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AutoCard } from "@/components/auto/AutoCard";
import { AutoOwnerControls } from "@/components/auto/AutoOwnerControls";

export const dynamic = "force-dynamic";

export default async function MyAutoListingsPage({ params }: PageProps<"/[lang]/auto/mine">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, listings] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyAutoListings(user.id),
  ]);
  const t = dict.auto;
  const m = dict.market;
  const canPost = await canPostIn("auto", user);
  const groups = [
    { key: "active", label: m.statusActive, items: listings.filter((l) => l.status === "ACTIVE") },
    { key: "paused", label: m.statusPaused, items: listings.filter((l) => l.status === "PAUSED") },
    { key: "sold", label: t.statusSold, items: listings.filter((l) => l.status === "SOLD") },
    { key: "removed", label: m.statusRemoved, items: listings.filter((l) => l.status === "REMOVED") },
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
            {canPost && <Link href={`/${lang}/auto/new`} className="btn btn-primary">＋ {t.post}</Link>}
          </div>
          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>{t.noneYet}</div>
          ) : (
            groups.map((g) =>
              g.items.length === 0 ? null : (
                <section key={g.key} className="biz-section">
                  <h2 className="biz-section-title" style={{ padding: "0 4px 8px" }}>{g.label} <span className="muted-sm">· {g.items.length}</span></h2>
                  <div className="mk-grid">
                    {g.items.map((l) => (
                      <AutoCard
                        key={l.id}
                        locale={lang}
                        dict={dict}
                        listing={l}
                        footer={
                          <>
                            <div className="muted-sm mk-stats">👁 {m.views.replace("{n}", String(l.views))}</div>
                            {l.status === "REMOVED" ? (
                              <span className="mk-removed-note">🚫 {m.removedBanner}{l.removedReason ? ` — ${l.removedReason}` : ""}</span>
                            ) : (
                              <AutoOwnerControls locale={lang} dict={dict} listingId={l.id} slug={l.slug} kind={l.kind} status={l.status} compact />
                            )}
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
