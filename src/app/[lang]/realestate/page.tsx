import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getListingDirectory, getFeaturedListings } from "@/lib/estate-data";
import { canPostIn } from "@/lib/posting-access";
import { PROPERTY_TYPES, formatPrice, propertyTypeIcon } from "@/lib/estate";
import { RADIUS_OPTIONS, DEFAULT_RADIUS, normalizeZip, lookupZip } from "@/lib/geo";
import {
  US_STATES,
  GEORGIA_VALUE,
  GEORGIA_FLAG,
  USA_VALUE,
  USA_FLAG,
  georgiaName,
  usaName,
  stateLabel,
} from "@/lib/us-states";
import { Header } from "@/components/Header";
import { FilterDrawer } from "@/components/FilterDrawer";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ListingCard } from "@/components/estate/ListingCard";

export const dynamic = "force-dynamic";

function num(v: unknown): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function RealEstatePage({ params, searchParams }: PageProps<"/[lang]/realestate">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const sortRaw = str(sp.sort);
  const filters = {
    q: str(sp.q),
    kind: str(sp.kind),
    propertyType: str(sp.type),
    state: str(sp.state),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    minBedrooms: num(sp.beds),
    minBathrooms: num(sp.baths),
    sort: (sortRaw === "priceAsc" || sortRaw === "priceDesc" || sortRaw === "nearest" ? sortRaw : undefined) as
      | "newest"
      | "nearest"
      | "priceAsc"
      | "priceDesc"
      | undefined,
    zip: normalizeZip(sp.zip) ?? undefined,
    radius: (RADIUS_OPTIONS as readonly number[]).includes(num(sp.radius) ?? 0)
      ? (num(sp.radius) as number)
      : undefined,
  };
  // A ZIP with no explicit radius still searches — default to the usual 25 mi.
  if (filters.zip && !filters.radius) filters.radius = DEFAULT_RADIUS;
  const zipKnown = filters.zip ? !!lookupZip(filters.zip) : true;
  const radiusOn = !!(filters.zip && zipKnown);
  const effectiveSort = filters.sort ?? (radiusOn ? "nearest" : "newest");

  const [dict, user, allCategories, listings, featured] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getListingDirectory({ ...filters, sort: effectiveSort }),
    getFeaturedListings(),
  ]);
  const t = dict.estate;
  const canPost = await canPostIn("estate", user);
  const hasFilters = !!(filters.q || filters.kind || filters.propertyType || filters.state || filters.zip || filters.minPrice || filters.maxPrice || filters.minBedrooms || filters.minBathrooms);

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
              {user && <Link href={`/${lang}/realestate/mine`} className="btn btn-ghost btn-sm">{t.myListings}</Link>}
              {canPost && (
                <Link href={`/${lang}/realestate/new`} className="btn btn-primary">＋ {t.post}</Link>
              )}
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
                  <Link key={l.id} href={`/${lang}/realestate/${l.slug}`} className="merch-tile re-featured-tile">
                    <div className="merch-tile-img">
                      {l.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photos[0]} alt="" loading="lazy" />
                      ) : (
                        <span>{propertyTypeIcon(l.propertyType)}</span>
                      )}
                      <span className={`mk-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"}`}>
                        {l.kind === "RENT" ? t.forRent : t.forSale}
                      </span>
                    </div>
                    <div className="merch-tile-price">
                      {formatPrice(l.price)}{l.kind === "RENT" && <small>{t.perMonth}</small>}
                    </div>
                    <div className="merch-tile-name">{l.title}</div>
                    <div className="muted-sm">{[l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ")}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Search */}
          <form className="mk-search-row" action={`/${lang}/realestate`} method="get">
            {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
            {filters.propertyType && <input type="hidden" name="type" value={filters.propertyType} />}
            {filters.state && <input type="hidden" name="state" value={filters.state} />}
            {filters.minPrice && <input type="hidden" name="minPrice" value={filters.minPrice} />}
            {filters.maxPrice && <input type="hidden" name="maxPrice" value={filters.maxPrice} />}
            {filters.minBedrooms && <input type="hidden" name="beds" value={filters.minBedrooms} />}
            {filters.minBathrooms && <input type="hidden" name="baths" value={filters.minBathrooms} />}
            {filters.sort && filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}
            {filters.zip && <input type="hidden" name="zip" value={filters.zip} />}
            {filters.radius && filters.radius !== DEFAULT_RADIUS && <input type="hidden" name="radius" value={filters.radius} />}
            <input className="input" name="q" placeholder={t.searchPlaceholder} defaultValue={filters.q ?? ""} />
            <button type="submit" className="btn btn-primary">{dict.business.search}</button>
          </form>

          <div className="mk-toolbar">
            <span className="muted-sm">
              {listings.length > 0 && dict.market.results.replace("{from}", "1").replace("{to}", String(listings.length)).replace("{n}", String(listings.length))}
              {hasFilters && (
                <>
                  {" "}· <Link href={`/${lang}/realestate`}>{dict.market.resetFilters}</Link>
                </>
              )}
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.empty}
            </div>
          ) : (
            <div className="re-grid">
              {listings.map((l) => (
                <ListingCard key={l.id} locale={lang} dict={dict} listing={l} distance={l.distance} />
              ))}
            </div>
          )}
        </main>

        {/* Filters (right column) */}
        <FilterDrawer label={dict.market.filters} closeLabel={dict.common.cancel}>
          <form action={`/${lang}/realestate`} method="get" className="card mk-panel mk-panel-form">
            <h2 className="mk-panel-title">{dict.market.filters}</h2>
            {filters.q && <input type="hidden" name="q" value={filters.q} />}

            <div className="mk-panel-group">
              <span className="mk-panel-label">{t.kind}</span>
              <div className="re-kind-toggle">
                {[
                  ["", t.saleAndRent],
                  ["SALE", t.forSale],
                  ["RENT", t.forRent],
                ].map(([v, label]) => (
                  <label key={v} className="re-kind-option">
                    <input type="radio" name="kind" value={v} defaultChecked={(filters.kind ?? "") === v} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-type">{t.propertyType}</label>
              <select id="f-type" className="input" name="type" defaultValue={filters.propertyType ?? ""}>
                <option value="">{t.allTypes}</option>
                {PROPERTY_TYPES.map((p) => (
                  <option key={p.key} value={p.key}>{p.icon} {lang === "ka" ? p.ka : p.en}</option>
                ))}
              </select>
            </div>
            <div className="mk-panel-group">
              <div className="mk-price-range">
                <select className="input" name="beds" defaultValue={filters.minBedrooms?.toString() ?? ""} aria-label={t.bedrooms}>
                  <option value="">{t.anyBeds}</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ {t.bd}</option>)}
                </select>
                <select className="input" name="baths" defaultValue={filters.minBathrooms?.toString() ?? ""} aria-label={t.bathrooms}>
                  <option value="">{t.anyBaths}</option>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{n}+ {t.ba}</option>)}
                </select>
              </div>
            </div>

            {/* Location — bracketed by a rule above and below */}
            <hr className="mk-panel-sep" />
            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-state">{dict.market.location}</label>
              <select id="f-state" className="input" name="state" defaultValue={filters.state ?? ""}>
                <option value="">{t.anywhere}</option>
                <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(lang)}</option>
                <option value={USA_VALUE}>{USA_FLAG} {usaName(lang)}</option>
                {US_STATES.map((s) => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
              </select>
              <div className="mk-zip-row">
                <input
                  className="input"
                  name="zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  placeholder={dict.market.zip}
                  defaultValue={filters.zip ?? ""}
                  aria-label={dict.market.zip}
                />
                <select className="input" name="radius" defaultValue={String(filters.radius ?? DEFAULT_RADIUS)} aria-label={dict.market.radius}>
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r} value={r}>{dict.market.radiusMiles.replace("{n}", String(r))}</option>
                  ))}
                </select>
              </div>
              {filters.zip && !zipKnown ? (
                <span className="field-error">{dict.market.unknownZip}</span>
              ) : (
                <span className="muted-sm mk-zip-hint">{dict.market.zipFilterHint}</span>
              )}
            </div>
            <hr className="mk-panel-sep" />

            <div className="mk-panel-group">
              <span className="mk-panel-label">{t.price}</span>
              <div className="mk-price-range">
                <input className="input" name="minPrice" type="number" min={0} placeholder={t.minPrice} defaultValue={filters.minPrice ?? ""} />
                <span>–</span>
                <input className="input" name="maxPrice" type="number" min={0} placeholder={t.maxPrice} defaultValue={filters.maxPrice ?? ""} />
              </div>
            </div>

            <hr className="mk-panel-sep" />

            <div className="mk-panel-group">
              <label className="mk-panel-label" htmlFor="f-sort">{dict.market.sortBy}</label>
              <select id="f-sort" className="input" name="sort" defaultValue={effectiveSort}>
                <option value="newest">{dict.market.sortNewest}</option>
                {radiusOn && <option value="nearest">{dict.market.sortNearest}</option>}
                <option value="priceAsc">{dict.market.sortPriceAsc}</option>
                <option value="priceDesc">{dict.market.sortPriceDesc}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-full">{dict.market.applyFilters}</button>
          </form>
        </FilterDrawer>
      </div>
    </>
  );
}
