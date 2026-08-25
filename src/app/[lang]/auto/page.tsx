import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { canPostAuto } from "@/lib/perks";
import { getAutoDirectory, getAutoMakeCounts, getFeaturedAuto, AUTO_PAGE_SIZE, AUTO_PAGE_SIZES, type AutoFilters } from "@/lib/auto-data";
import {
  AUTO_MAKES,
  makeKey,
  makeName,
  AUTO_BODY_TYPES,
  AUTO_TRANSMISSIONS,
  AUTO_FUELS,
  AUTO_MIN_YEAR,
  AUTO_MAX_YEAR,
  isAutoSort,
  autoIcon,
} from "@/lib/auto";
import { formatPrice } from "@/lib/estate";
import { RADIUS_OPTIONS, DEFAULT_RADIUS, normalizeZip, lookupZip } from "@/lib/geo";
import { US_STATES, GEORGIA_VALUE, GEORGIA_FLAG, USA_VALUE, USA_FLAG, georgiaName, usaName, stateLabel } from "@/lib/us-states";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AutoCard } from "@/components/auto/AutoCard";
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

export default async function AutoMarketPage({ params, searchParams }: PageProps<"/[lang]/auto">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;

  const filters: AutoFilters = {
    q: str(sp.q),
    kind: sp.kind === "SALE" || sp.kind === "RENT" ? sp.kind : undefined,
    make: str(sp.make),
    model: str(sp.model),
    yearMin: num(sp.yearMin),
    yearMax: num(sp.yearMax),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    negotiableOnly: sp.negotiable === "1",
    maxMileage: num(sp.maxMileage),
    bodyType: str(sp.body),
    transmission: str(sp.transmission),
    fuel: str(sp.fuel),
    insuredOnly: sp.insured === "1",
    state: str(sp.state),
    zip: normalizeZip(sp.zip) ?? undefined,
    radius: (RADIUS_OPTIONS as readonly number[]).includes(num(sp.radius) ?? 0) ? (num(sp.radius) as number) : undefined,
    sort: isAutoSort(sp.sort) ? sp.sort : undefined,
  };
  if (filters.zip && !filters.radius) filters.radius = DEFAULT_RADIUS;
  const zipKnown = filters.zip ? !!lookupZip(filters.zip) : true;
  const radiusOn = !!(filters.zip && zipKnown);
  const effectiveSort = filters.sort ?? (radiusOn ? "nearest" : "newest");
  const page = Math.max(1, num(sp.page) ?? 1);
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const perRaw = num(sp.per);
  const per = (AUTO_PAGE_SIZES as readonly number[]).includes(perRaw ?? 0) ? (perRaw as number) : AUTO_PAGE_SIZE;

  const [dict, user, allCategories, dir, makeCounts, featured] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getAutoDirectory({ ...filters, sort: effectiveSort }, page, per),
    getAutoMakeCounts({ ...filters, sort: effectiveSort }),
    getFeaturedAuto(),
  ]);
  const t = dict.auto;
  const m = dict.market;
  const totalAll = Object.values(makeCounts).reduce((s, n) => s + n, 0);

  const base: Record<string, string> = {};
  const put = (k: string, v: string | number | boolean | undefined) => {
    if (v === undefined || v === "" || v === false) return;
    base[k] = String(v === true ? "1" : v);
  };
  put("q", filters.q); put("kind", filters.kind); put("make", filters.make); put("model", filters.model);
  put("yearMin", filters.yearMin); put("yearMax", filters.yearMax); put("minPrice", filters.minPrice); put("maxPrice", filters.maxPrice);
  put("negotiable", filters.negotiableOnly); put("maxMileage", filters.maxMileage); put("body", filters.bodyType);
  put("transmission", filters.transmission); put("fuel", filters.fuel); put("insured", filters.insuredOnly); put("state", filters.state);
  put("zip", filters.zip); if (filters.radius && filters.radius !== DEFAULT_RADIUS) put("radius", filters.radius);
  if (filters.sort && filters.sort !== "newest") put("sort", filters.sort);
  if (view === "list") put("view", "list"); if (per !== AUTO_PAGE_SIZE) put("per", per);

  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(base);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return `/${lang}/auto${s ? `?${s}` : ""}`;
  };
  const hasFilters = Object.keys(base).some((k) => !["view", "per", "sort", "q"].includes(k)) || !!filters.q;
  const from = (page - 1) * per + 1;
  const to = Math.min(dir.total, page * per);
  const lbl = (d: { en: string; ka: string }) => (lang === "ka" ? d.ka : d.en);
  const years = Array.from({ length: AUTO_MAX_YEAR - AUTO_MIN_YEAR + 1 }, (_, i) => AUTO_MAX_YEAR - i);

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
              {user && <Link href={`/${lang}/auto/mine`} className="btn btn-ghost btn-sm">{t.myListings}</Link>}
              <Link href={canPostAuto(user) ? `/${lang}/auto/new` : `/${lang}/login?next=/${lang}/auto/new`} className="btn btn-primary">
                ＋ {t.post}
              </Link>
            </div>
          </div>

          {/* Featured banner (admin-curated) */}
          {featured.length > 0 && !hasFilters && (
            <section className="card re-featured" aria-label={t.featuredTitle}>
              <div className="merch-strip-head">
                <h2 className="merch-strip-title">★ {t.featuredTitle}</h2>
              </div>
              <div className="merch-strip-row">
                {featured.map((l) => (
                  <Link key={l.id} href={`/${lang}/auto/${l.slug}`} className="merch-tile re-featured-tile">
                    <div className="merch-tile-img">
                      {l.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photos[0]} alt="" loading="lazy" />
                      ) : (
                        <span>{autoIcon(AUTO_BODY_TYPES, l.bodyType)}</span>
                      )}
                      <span className={`mk-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"}`}>
                        {l.kind === "RENT" ? t.forRent : t.forSale}
                      </span>
                    </div>
                    <div className="merch-tile-price">
                      {formatPrice(l.price)}{l.kind === "RENT" && <small>{t.perDay}</small>}
                    </div>
                    <div className="merch-tile-name">{l.title}</div>
                    <div className="muted-sm">{[l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ")}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Search */}
          <form className="mk-search-row" action={`/${lang}/auto`} method="get">
            {Object.entries(base).filter(([k]) => k !== "q").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="input" name="q" placeholder={t.searchPlaceholder} defaultValue={filters.q ?? ""} />
            <button type="submit" className="btn btn-primary">{dict.business.search}</button>
          </form>

          <div className="mk-toolbar">
            <span className="muted-sm">
              {dir.total > 0 ? m.results.replace("{from}", String(from)).replace("{to}", String(to)).replace("{n}", String(dir.total)) : ""}
              {hasFilters && <> · <Link href={`/${lang}/auto`}>{m.resetFilters}</Link></>}
            </span>
            <div className="mk-toolbar-right">
              <PerPageSelect
                value={per}
                label={m.perPage}
                options={AUTO_PAGE_SIZES.map((n) => ({ n, href: link({ per: n === AUTO_PAGE_SIZE ? undefined : String(n), page: undefined }) }))}
              />
              <div className="mk-view" role="group" aria-label={m.view}>
                <Link href={link({ view: undefined })} className={`mk-view-btn${view === "grid" ? " on" : ""}`} title={m.viewGrid} aria-label={m.viewGrid}>▦</Link>
                <Link href={link({ view: "list" })} className={`mk-view-btn${view === "list" ? " on" : ""}`} title={m.viewList} aria-label={m.viewList}>☰</Link>
              </div>
            </div>
          </div>

          {dir.items.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>{t.empty}</div>
          ) : (
            <>
              <div className={view === "list" ? "mk-list" : "mk-grid"}>
                {dir.items.map((l) => <AutoCard key={l.id} locale={lang} dict={dict} listing={l} variant={view} />)}
              </div>
              {dir.pages > 1 && (
                <nav className="mk-pagination" aria-label="Pagination">
                  {page > 1 ? <Link href={link({ page: page - 1 > 1 ? String(page - 1) : undefined })} className="btn btn-ghost btn-sm">‹ {m.prev}</Link> : <span />}
                  <span className="muted-sm">{m.pageOf.replace("{p}", String(page)).replace("{n}", String(dir.pages))}</span>
                  {page < dir.pages ? <Link href={link({ page: String(page + 1) })} className="btn btn-ghost btn-sm">{m.next} ›</Link> : <span />}
                </nav>
              )}
            </>
          )}
        </main>

        {/* Filters (right column) */}
        <aside className="mk-filter-col">
          <form action={`/${lang}/auto`} method="get" className="card mk-panel mk-panel-form">
            <h2 className="mk-panel-title">{m.filters}</h2>
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            {view === "list" && <input type="hidden" name="view" value="list" />}

            <div className="mk-panel-group">
              <span className="mk-panel-label">{t.kind}</span>
              <div className="re-kind-toggle">
                {[["", t.saleAndRent], ["SALE", t.forSale], ["RENT", t.forRent]].map(([v, label]) => (
                  <label key={v} className="re-kind-option">
                    <input type="radio" name="kind" value={v} defaultChecked={(filters.kind ?? "") === v} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-make">{t.make}</label>
              <select id="f-make" className="input" name="make" defaultValue={filters.make ?? ""}>
                <option value="">{t.allMakes} ({totalAll})</option>
                {AUTO_MAKES.map((mk) => {
                  const k = makeKey(mk);
                  const n = makeCounts[k] ?? 0;
                  if (n === 0 && filters.make !== k) return null;
                  return <option key={k} value={k}>{mk} ({n})</option>;
                })}
                {(makeCounts.other ?? 0) > 0 && <option value="other">{t.otherMake} ({makeCounts.other})</option>}
              </select>
              <input className="input" name="model" placeholder={t.model} defaultValue={filters.model ?? ""} aria-label={t.model} />
            </div>
            <div className="mk-panel-group">
              <span className="mk-panel-label">{t.year}</span>
              <div className="mk-price-range">
                <select className="input" name="yearMin" defaultValue={filters.yearMin ?? ""} aria-label={t.yearFrom}>
                  <option value="">{t.yearFrom}</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <span>–</span>
                <select className="input" name="yearMax" defaultValue={filters.yearMax ?? ""} aria-label={t.yearTo}>
                  <option value="">{t.yearTo}</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="mk-panel-group">
              <div className="mk-price-range">
                <select className="input" name="body" defaultValue={filters.bodyType ?? ""} aria-label={t.bodyType}>
                  <option value="">{t.anyBody}</option>
                  {AUTO_BODY_TYPES.map((b) => <option key={b.key} value={b.key}>{b.icon} {lbl(b)}</option>)}
                </select>
                <select className="input" name="transmission" defaultValue={filters.transmission ?? ""} aria-label={t.transmission}>
                  <option value="">{t.anyTransmission}</option>
                  {AUTO_TRANSMISSIONS.map((b) => <option key={b.key} value={b.key}>{lbl(b)}</option>)}
                </select>
              </div>
              <div className="mk-price-range">
                <select className="input" name="fuel" defaultValue={filters.fuel ?? ""} aria-label={t.fuel}>
                  <option value="">{t.anyFuel}</option>
                  {AUTO_FUELS.map((b) => <option key={b.key} value={b.key}>{b.icon} {lbl(b)}</option>)}
                </select>
                <input className="input" name="maxMileage" type="number" min={0} placeholder={t.maxMileage} defaultValue={filters.maxMileage ?? ""} />
              </div>
              <label className="mk-check">
                <input type="checkbox" name="insured" value="1" defaultChecked={filters.insuredOnly} />
                <span>🛡️ {t.insuredOnly}</span>
              </label>
            </div>

            {/* Location — bracketed by a rule above and below */}
            <hr className="mk-panel-sep" />
            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-state">{m.location}</label>
              <select id="f-state" className="input" name="state" defaultValue={filters.state ?? ""}>
                <option value="">{m.anywhere}</option>
                <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(lang)}</option>
                <option value={USA_VALUE}>{USA_FLAG} {usaName(lang)}</option>
                {US_STATES.map((s) => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
              </select>
              <div className="mk-zip-row">
                <input className="input" name="zip" inputMode="numeric" autoComplete="postal-code" maxLength={10} placeholder={m.zip} defaultValue={filters.zip ?? ""} aria-label={m.zip} />
                <select className="input" name="radius" defaultValue={String(filters.radius ?? DEFAULT_RADIUS)} aria-label={m.radius}>
                  {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{m.radiusMiles.replace("{n}", String(r))}</option>)}
                </select>
              </div>
              {filters.zip && !zipKnown ? <span className="field-error">{m.unknownZip}</span> : <span className="muted-sm mk-zip-hint">{m.zipFilterHint}</span>}
            </div>
            <hr className="mk-panel-sep" />

            <div className="mk-panel-group">
              <span className="mk-panel-label">{t.price}</span>
              <div className="mk-price-range">
                <input className="input" name="minPrice" type="number" min={0} placeholder={dict.estate.minPrice} defaultValue={filters.minPrice ?? ""} />
                <span>–</span>
                <input className="input" name="maxPrice" type="number" min={0} placeholder={dict.estate.maxPrice} defaultValue={filters.maxPrice ?? ""} />
              </div>
              <label className="mk-check">
                <input type="checkbox" name="negotiable" value="1" defaultChecked={filters.negotiableOnly} />
                <span>🤝 {t.negotiableOnly}</span>
              </label>
            </div>

            <hr className="mk-panel-sep" />
            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-sort">{m.sortBy}</label>
              <select id="f-sort" className="input" name="sort" defaultValue={effectiveSort}>
                <option value="newest">{m.sortNewest}</option>
                {radiusOn && <option value="nearest">{m.sortNearest}</option>}
                <option value="priceAsc">{m.sortPriceAsc}</option>
                <option value="priceDesc">{m.sortPriceDesc}</option>
                <option value="yearDesc">{t.sortYearDesc}</option>
                <option value="mileageAsc">{t.sortMileageAsc}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-full">{m.applyFilters}</button>
          </form>
        </aside>
      </div>
    </>
  );
}
