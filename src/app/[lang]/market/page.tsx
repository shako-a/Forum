import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { canSellOnMarket } from "@/lib/perks";
import {
  getMarketDirectory,
  getMarketCategoryCounts,
  attachSaved,
  MARKET_PAGE_SIZE,
  type MarketFilters,
} from "@/lib/market-data";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, isMarketSort } from "@/lib/market";
import {
  US_STATES,
  GEORGIA_VALUE,
  GEORGIA_FLAG,
  USA_VALUE,
  USA_FLAG,
  georgiaName,
  usaName,
} from "@/lib/us-states";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarketCard } from "@/components/market/MarketCard";

export const dynamic = "force-dynamic";

function num(v: unknown): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function MarketPage({ params, searchParams }: PageProps<"/[lang]/market">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;

  const filters: MarketFilters = {
    q: str(sp.q),
    category: str(sp.category),
    condition: str(sp.condition),
    state: str(sp.state),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    shipping: sp.ships === "1",
    freeOnly: sp.free === "1",
    sort: isMarketSort(sp.sort) ? sp.sort : "newest",
  };
  const page = Math.max(1, num(sp.page) ?? 1);

  const [dict, user, allCategories, dir, counts] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMarketDirectory(filters, page),
    getMarketCategoryCounts(filters),
  ]);
  const items = await attachSaved(dir.items, user?.id);
  const t = dict.market;
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  // Query string for links that keep the current filters (category chips,
  // pagination) — built from the parsed values so nothing odd is echoed back.
  const base: Record<string, string> = {};
  if (filters.q) base.q = filters.q;
  if (filters.condition) base.condition = filters.condition;
  if (filters.state) base.state = filters.state;
  if (filters.minPrice) base.minPrice = String(filters.minPrice);
  if (filters.maxPrice) base.maxPrice = String(filters.maxPrice);
  if (filters.shipping) base.ships = "1";
  if (filters.freeOnly) base.free = "1";
  if (filters.sort && filters.sort !== "newest") base.sort = filters.sort;
  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ ...base, ...(filters.category ? { category: filters.category } : {}) });
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return `/${lang}/market${s ? `?${s}` : ""}`;
  };

  const from = (page - 1) * MARKET_PAGE_SIZE + 1;
  const to = Math.min(dir.total, page * MARKET_PAGE_SIZE);

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
            <div className="mk-head-actions">
              {user && (
                <>
                  <Link href={`/${lang}/market/saved`} className="btn btn-ghost btn-sm">♥ {t.savedItems}</Link>
                  <Link href={`/${lang}/market/mine`} className="btn btn-ghost btn-sm">{t.myListings}</Link>
                </>
              )}
              {canSellOnMarket(user) ? (
                <Link href={`/${lang}/market/new`} className="btn btn-primary">＋ {t.sell}</Link>
              ) : (
                <Link href={`/${lang}/login?next=/${lang}/market/new`} className="btn btn-primary">＋ {t.sell}</Link>
              )}
            </div>
          </div>

          {/* Search + filters */}
          <form className="mk-filters" action={`/${lang}/market`} method="get">
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            <div className="mk-search-row">
              <input className="input" name="q" placeholder={t.searchPlaceholder} defaultValue={filters.q ?? ""} />
              <button type="submit" className="btn btn-primary">{dict.business.search}</button>
            </div>
            <div className="mk-filter-row">
              <select className="input" name="condition" defaultValue={filters.condition ?? ""}>
                <option value="">{t.anyCondition}</option>
                {MARKET_CONDITIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.icon} {lang === "ka" ? c.ka : c.en}</option>
                ))}
              </select>
              <select className="input" name="state" defaultValue={filters.state ?? ""}>
                <option value="">{t.anywhere}</option>
                <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(lang)}</option>
                <option value={USA_VALUE}>{USA_FLAG} {usaName(lang)}</option>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>{s.name}</option>
                ))}
              </select>
              <input className="input" name="minPrice" type="number" min={0} placeholder={dict.estate.minPrice} defaultValue={filters.minPrice ?? ""} />
              <input className="input" name="maxPrice" type="number" min={0} placeholder={dict.estate.maxPrice} defaultValue={filters.maxPrice ?? ""} />
              <select className="input" name="sort" defaultValue={filters.sort}>
                <option value="newest">{t.sortNewest}</option>
                <option value="priceAsc">{t.sortPriceAsc}</option>
                <option value="priceDesc">{t.sortPriceDesc}</option>
              </select>
              <label className="mk-check">
                <input type="checkbox" name="ships" value="1" defaultChecked={filters.shipping} />
                <span>📦 {t.shipsOnly}</span>
              </label>
              <label className="mk-check">
                <input type="checkbox" name="free" value="1" defaultChecked={filters.freeOnly} />
                <span>🎁 {t.freeOnly}</span>
              </label>
            </div>
          </form>

          {/* Browse by category */}
          <nav className="mk-cats" aria-label={t.category}>
            <Link href={link({ category: undefined, page: undefined })} className={`mk-cat${!filters.category ? " on" : ""}`}>
              {t.allCategories} <span className="mk-cat-n">{totalAll}</span>
            </Link>
            {MARKET_CATEGORIES.map((c) => {
              const n = counts[c.key] ?? 0;
              if (n === 0 && filters.category !== c.key) return null;
              return (
                <Link
                  key={c.key}
                  href={link({ category: c.key, page: undefined })}
                  className={`mk-cat${filters.category === c.key ? " on" : ""}`}
                >
                  {c.icon} {lang === "ka" ? c.ka : c.en} <span className="mk-cat-n">{n}</span>
                </Link>
              );
            })}
          </nav>

          {items.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.empty}
            </div>
          ) : (
            <>
              <p className="mk-results muted-sm">{t.results.replace("{from}", String(from)).replace("{to}", String(to)).replace("{n}", String(dir.total))}</p>
              <div className="mk-grid">
                {items.map((l) => (
                  <MarketCard key={l.id} locale={lang} dict={dict} listing={l} viewerId={user?.id} />
                ))}
              </div>
              {dir.pages > 1 && (
                <nav className="mk-pagination" aria-label="Pagination">
                  {page > 1 ? (
                    <Link href={link({ page: page - 1 > 1 ? String(page - 1) : undefined })} className="btn btn-ghost btn-sm">‹ {t.prev}</Link>
                  ) : <span />}
                  <span className="muted-sm">{t.pageOf.replace("{p}", String(page)).replace("{n}", String(dir.pages))}</span>
                  {page < dir.pages ? (
                    <Link href={link({ page: String(page + 1) })} className="btn btn-ghost btn-sm">{t.next} ›</Link>
                  ) : <span />}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
