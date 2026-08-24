import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getListingDirectory } from "@/lib/estate-data";
import { canPostListing } from "@/lib/perks";
import { PROPERTY_TYPES } from "@/lib/estate";
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
import { ListingCard } from "@/components/estate/ListingCard";

export const dynamic = "force-dynamic";

// "3" -> 3; anything non-numeric -> undefined (filters stay off).
function num(v: unknown): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function RealEstatePage({
  params,
  searchParams,
}: PageProps<"/[lang]/realestate">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const filters = {
    q: str(sp.q),
    kind: str(sp.kind),
    propertyType: str(sp.type),
    state: str(sp.state),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    minBedrooms: num(sp.beds),
    minBathrooms: num(sp.baths),
  };

  const [dict, user, allCategories, listings] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getListingDirectory(filters),
  ]);
  const t = dict.estate;

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
            {canPostListing(user) && (
              <Link href={`/${lang}/realestate/new`} className="btn btn-primary">＋ {t.post}</Link>
            )}
          </div>

          <form className="re-filters" action={`/${lang}/realestate`} method="get">
            <input className="input re-filter-q" name="q" placeholder={t.searchPlaceholder} defaultValue={filters.q ?? ""} />
            <select className="input" name="kind" defaultValue={filters.kind ?? ""}>
              <option value="">{t.saleAndRent}</option>
              <option value="SALE">{t.forSale}</option>
              <option value="RENT">{t.forRent}</option>
            </select>
            <select className="input" name="type" defaultValue={filters.propertyType ?? ""}>
              <option value="">{t.allTypes}</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p.key} value={p.key}>{p.icon} {lang === "ka" ? p.ka : p.en}</option>
              ))}
            </select>
            <select className="input" name="beds" defaultValue={filters.minBedrooms?.toString() ?? ""}>
              <option value="">{t.anyBeds}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+ {t.bd}</option>
              ))}
            </select>
            <select className="input" name="baths" defaultValue={filters.minBathrooms?.toString() ?? ""}>
              <option value="">{t.anyBaths}</option>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>{n}+ {t.ba}</option>
              ))}
            </select>
            <input className="input" name="minPrice" type="number" min={0} placeholder={t.minPrice} defaultValue={filters.minPrice ?? ""} />
            <input className="input" name="maxPrice" type="number" min={0} placeholder={t.maxPrice} defaultValue={filters.maxPrice ?? ""} />
            <select className="input" name="state" defaultValue={filters.state ?? ""}>
              <option value="">{t.anywhere}</option>
              <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(lang)}</option>
              <option value={USA_VALUE}>{USA_FLAG} {usaName(lang)}</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost">{dict.business.search}</button>
          </form>

          {listings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.empty}
            </div>
          ) : (
            <div className="re-grid">
              {listings.map((l) => (
                <ListingCard key={l.id} locale={lang} dict={dict} listing={l} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
