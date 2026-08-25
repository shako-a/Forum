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
  MARKET_PAGE_SIZES,
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
import { PerPageSelect } from "@/components/market/PerPageSelect";

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
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const perRaw = num(sp.per);
  const per = (MARKET_PAGE_SIZES as readonly number[]).includes(perRaw ?? 0) ? (perRaw as number) : MARKET_PAGE_SIZE;

  const [dict, user, allCategories, dir, counts] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMarketDirectory(filters, page, per),
    getMarketCategoryCounts(filters),
  ]);
  const items = await attachSaved(dir.items, user?.id);
  const t = dict.market;
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  // Query string for links that keep the current filters (category list,
  // pagination, view toggle) — built from the parsed values so nothing odd
  // is echoed back.
  const base: Record<string, string> = {};
  if (filters.q) base.q = filters.q;
  if (filters.category) base.category = filters.category;
  if (filters.condition) base.condition = filters.condition;
  if (filters.state) base.state = filters.state;
  if (filters.minPrice) base.minPrice = String(filters.minPrice);
  if (filters.maxPrice) base.maxPrice = String(filters.maxPrice);
  if (filters.shipping) base.ships = "1";
  if (filters.freeOnly) base.free = "1";
  if (filters.sort && filters.sort !== "newest") base.sort = filters.sort;
  if (view === "list") base.view = "list";
  if (per !== MARKET_PAGE_SIZE) base.per = String(per);
  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(base);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return `/${lang}/market${s ? `?${s}` : ""}`;
  };
  const activeFilterCount = [filters.category, filters.condition, filters.state, filters.minPrice, filters.maxPrice, filters.shipping || undefined, filters.freeOnly || undefined].filter(Boolean).length;

  const from = (page - 1) * per + 1;
  const to = Math.min(dir.total, page * per);

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
              <Link
                href={canSellOnMarket(user) ? `/${lang}/market/new` : `/${lang}/login?next=/${lang}/market/new`}
                className="btn btn-primary"
              >
                ＋ {t.sell}
              </Link>
            </div>
          </div>

          {/* Search */}
          <form className="mk-search-row" action={`/${lang}/market`} method="get">
            {Object.entries(base)
              .filter(([k]) => k !== "q")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <input className="input" name="q" placeholder={t.searchPlaceholder} defaultValue={filters.q ?? ""} />
            <button type="submit" className="btn btn-primary">{dict.business.search}</button>
          </form>

          {/* Results toolbar */}
          <div className="mk-toolbar">
            <span className="muted-sm">
              {dir.total > 0
                ? t.results.replace("{from}", String(from)).replace("{to}", String(to)).replace("{n}", String(dir.total))
                : ""}
              {activeFilterCount > 0 && (
                <>
                  {" "}
                  · <Link href={`/${lang}/market${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`}>{t.resetFilters}</Link>
                </>
              )}
            </span>
            <div className="mk-toolbar-right">
            <PerPageSelect
              value={per}
              label={t.perPage}
              options={MARKET_PAGE_SIZES.map((n) => ({ n, href: link({ per: n === MARKET_PAGE_SIZE ? undefined : String(n), page: undefined }) }))}
            />
            <div className="mk-view" role="group" aria-label={t.view}>
              <Link href={link({ view: undefined })} className={`mk-view-btn${view === "grid" ? " on" : ""}`} title={t.viewGrid} aria-label={t.viewGrid}>
                ▦
              </Link>
              <Link href={link({ view: "list" })} className={`mk-view-btn${view === "list" ? " on" : ""}`} title={t.viewList} aria-label={t.viewList}>
                ☰
              </Link>
            </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.empty}
            </div>
          ) : (
            <>
              <div className={view === "list" ? "mk-list" : "mk-grid"}>
                {items.map((l) => (
                  <MarketCard key={l.id} locale={lang} dict={dict} listing={l} viewerId={user?.id} variant={view} />
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

        {/* Filters (right column) */}
        <aside className="mk-filter-col">
          <div className="card mk-panel">
            <h2 className="mk-panel-title">{t.filters}</h2>

            {/* Categories are links (they navigate immediately) */}
            <div className="mk-panel-group">
              <h3 className="mk-panel-label">{t.category}</h3>
              <ul className="mk-cat-list">
                <li>
                  <Link href={link({ category: undefined, page: undefined })} className={`mk-cat-item${!filters.category ? " on" : ""}`}>
                    <span>{t.allCategories}</span>
                    <span className="mk-cat-n">{totalAll}</span>
                  </Link>
                </li>
                {MARKET_CATEGORIES.map((c) => {
                  const n = counts[c.key] ?? 0;
                  if (n === 0 && filters.category !== c.key) return null;
                  return (
                    <li key={c.key}>
                      <Link href={link({ category: c.key, page: undefined })} className={`mk-cat-item${filters.category === c.key ? " on" : ""}`}>
                        <span>{c.icon} {lang === "ka" ? c.ka : c.en}</span>
                        <span className="mk-cat-n">{n}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <form action={`/${lang}/market`} method="get" className="mk-panel-form">
              {filters.q && <input type="hidden" name="q" value={filters.q} />}
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {view === "list" && <input type="hidden" name="view" value="list" />}

              <div className="mk-panel-group">
                <label className="mk-panel-label" htmlFor="f-condition">{t.condition}</label>
                <select id="f-condition" className="input" name="condition" defaultValue={filters.condition ?? ""}>
                  <option value="">{t.anyCondition}</option>
                  {MARKET_CONDITIONS.map((c) => (
                    <option key={c.key} value={c.key}>{c.icon} {lang === "ka" ? c.ka : c.en}</option>
                  ))}
                </select>
              </div>

              <hr className="mk-panel-sep" />

              <div className="mk-panel-group">
                <label className="mk-panel-label" htmlFor="f-state">{t.location}</label>
                <select id="f-state" className="input" name="state" defaultValue={filters.state ?? ""}>
                  <option value="">{t.anywhere}</option>
                  <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(lang)}</option>
                  <option value={USA_VALUE}>{USA_FLAG} {usaName(lang)}</option>
                  {US_STATES.map((s) => (
                    <option key={s.abbr} value={s.abbr}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="mk-panel-group">
                <span className="mk-panel-label">{t.price}</span>
                <div className="mk-price-range">
                  <input className="input" name="minPrice" type="number" min={0} placeholder={dict.estate.minPrice} defaultValue={filters.minPrice ?? ""} />
                  <span>–</span>
                  <input className="input" name="maxPrice" type="number" min={0} placeholder={dict.estate.maxPrice} defaultValue={filters.maxPrice ?? ""} />
                </div>
                <label className="mk-check">
                  <input type="checkbox" name="free" value="1" defaultChecked={filters.freeOnly} />
                  <span>🎁 {t.freeOnly}</span>
                </label>
                <label className="mk-check">
                  <input type="checkbox" name="ships" value="1" defaultChecked={filters.shipping} />
                  <span>📦 {t.shipsOnly}</span>
                </label>
              </div>

              <hr className="mk-panel-sep" />

              <div className="mk-panel-group">
                <label className="mk-panel-label" htmlFor="f-sort">{t.sortBy}</label>
                <select id="f-sort" className="input" name="sort" defaultValue={filters.sort}>
                  <option value="newest">{t.sortNewest}</option>
                  <option value="priceAsc">{t.sortPriceAsc}</option>
                  <option value="priceDesc">{t.sortPriceDesc}</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-full">{t.applyFilters}</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
