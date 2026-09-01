import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyListings, summarize, type MyListingKind, type MyListingRow, type MyListingStatus } from "@/lib/my-listings";
import { formatPrice } from "@/lib/estate";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ListingRowActions } from "@/components/account/ListingRowActions";

export const dynamic = "force-dynamic";

const KINDS: MyListingKind[] = ["estate", "auto", "market", "job"];
const STATUS_FILTERS = ["all", "live", "attention", "paused", "closed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function matches(row: MyListingRow, f: StatusFilter): boolean {
  switch (f) {
    case "live":
      return row.status === "LIVE";
    case "attention":
      return row.status === "EXPIRED" || row.status === "REMOVED";
    case "paused":
      return row.status === "PAUSED";
    case "closed":
      return row.status === "CLOSED" || row.status === "REMOVED";
    default:
      return true;
  }
}

export default async function MyListingsPage({ params, searchParams }: PageProps<"/[lang]/account/listings">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const sp = await searchParams;
  const filter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(String(sp.status)) ? (sp.status as StatusFilter) : "all";
  const only = KINDS.includes(sp.kind as MyListingKind) ? (sp.kind as MyListingKind) : null;

  const [dict, allCategories, buckets] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyListings(user.id, lang),
  ]);
  const t = dict.account;
  const sum = summarize(buckets);

  const statusLabel: Record<MyListingStatus, string> = {
    LIVE: t.statusLive,
    PAUSED: t.statusPaused,
    EXPIRED: t.statusExpired,
    CLOSED: t.statusClosed,
    REMOVED: t.statusRemoved,
  };
  const sectionLabel: Record<MyListingKind, string> = {
    estate: dict.estate.directory,
    auto: dict.auto.directory,
    market: dict.market.directory,
    job: dict.business.jobsBoard,
  };
  const sectionIcon: Record<MyListingKind, string> = { estate: "🏠", auto: "🚗", market: "🛍️", job: "💼" };
  const newHref: Record<MyListingKind, string> = {
    estate: `/${lang}/realestate/new`,
    auto: `/${lang}/auto/new`,
    market: `/${lang}/market/new`,
    job: `/${lang}/jobs/new`,
  };

  const link = (patch: { status?: string; kind?: string | null }) => {
    const q = new URLSearchParams();
    const s = patch.status ?? filter;
    const k = patch.kind === null ? null : (patch.kind ?? only);
    if (s && s !== "all") q.set("status", s);
    if (k) q.set("kind", k);
    const qs = q.toString();
    return `/${lang}/account/listings${qs ? `?${qs}` : ""}`;
  };

  const tiles = [
    { label: t.tileLive, value: sum.live, icon: "🟢", status: "live" },
    { label: t.tileAttention, value: sum.attention, icon: "⚠️", status: "attention" },
    { label: t.tilePaused, value: sum.paused, icon: "⏸", status: "paused" },
    { label: t.tileClosed, value: sum.closed, icon: "✓", status: "closed" },
    { label: t.tileViews, value: sum.views, icon: "👁", status: "all" },
  ];
  const shown = only ? [only] : KINDS;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">📋 {t.myListingsTitle}</h1>
            <p className="account-sub">{t.myListingsSub}</p>
          </div>

          {sum.total === 0 ? (
            <div className="card card-pad my-listings-empty">
              <p>{t.noListingsAtAll}</p>
              <div className="my-listings-cta">
                {KINDS.map((k) => (
                  <Link key={k} href={newHref[k]} className="btn btn-ghost btn-sm">
                    {sectionIcon[k]} {t.postIn.replace("{area}", sectionLabel[k])}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="admin-stats my-listings-tiles">
                {tiles.map((s) => (
                  <Link key={s.label} href={link({ status: s.status })} className={`admin-stat admin-stat-link${filter === s.status && s.status !== "all" ? " on" : ""}`}>
                    <span className="admin-stat-ico" aria-hidden="true">{s.icon}</span>
                    <span className="admin-stat-value">{s.value}</span>
                    <span className="admin-stat-label">{s.label}</span>
                  </Link>
                ))}
              </div>

              {/* Category + status filters */}
              <div className="admin-tabs my-listings-tabs">
                <Link href={link({ kind: null })} className={`admin-tab${!only ? " on" : ""}`}>
                  {t.allCategories} ({sum.total})
                </Link>
                {KINDS.map((k) => (
                  <Link key={k} href={link({ kind: k })} className={`admin-tab${only === k ? " on" : ""}`}>
                    {sectionIcon[k]} {sectionLabel[k]} ({buckets[k].length})
                  </Link>
                ))}
                <span className="admin-tabs-sep" />
                {STATUS_FILTERS.map((f) => (
                  <Link key={f} href={link({ status: f })} className={`admin-tab${filter === f ? " on" : ""}`}>
                    {f === "all" ? t.filterAll : statusFilterLabel(f, t)}
                  </Link>
                ))}
              </div>

              {shown.map((k) => {
                const rows = buckets[k].filter((r) => matches(r, filter));
                if (buckets[k].length === 0 && only !== k) return null;
                return (
                  <section key={k} className="biz-section my-listings-section">
                    <div className="admin-list-head">
                      <h2 className="biz-section-title">
                        {sectionIcon[k]} {sectionLabel[k]} <span className="muted-sm">· {rows.length}</span>
                      </h2>
                      <Link href={newHref[k]} className="btn btn-ghost btn-sm">＋ {t.postNew}</Link>
                    </div>
                    {rows.length === 0 ? (
                      <p className="muted-sm my-listings-none">{t.noneInFilter}</p>
                    ) : (
                      <div className="my-listings-tablewrap">
                        <table className="admin-table my-listings-table">
                          <thead>
                            <tr>
                              <th>{t.colListing}</th>
                              <th>{t.colStatus}</th>
                              <th>{t.colPrice}</th>
                              <th>{t.colStats}</th>
                              <th>{t.colUpdated}</th>
                              <th style={{ textAlign: "right" }}>{dict.admin.actions}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className={r.status === "LIVE" ? "" : "my-listing-dim"}>
                                <td>
                                  <div className="report-listing">
                                    <Link href={r.href} className="report-listing-thumb">
                                      {r.thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.thumb} alt="" />
                                      ) : (
                                        <span>{sectionIcon[k]}</span>
                                      )}
                                    </Link>
                                    <div className="report-listing-info">
                                      <Link href={r.href} className="admin-link">{r.title}</Link>
                                      {r.meta && <div className="muted-sm">📍 {r.meta}</div>}
                                      {r.note && <div className="muted-sm">{r.note}</div>}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`my-status my-status-${r.status.toLowerCase()}`}>{statusLabel[r.status]}</span>
                                </td>
                                <td className="num">
                                  {r.priceCents === null ? "—" : r.priceCents === 0 ? dict.market.free : `${formatPrice(r.priceCents)}${r.priceSuffix ?? ""}`}
                                </td>
                                <td className="num muted-sm">
                                  {r.views !== null && <>👁 {r.views}</>}
                                  {r.saves !== null && <> · ♥ {r.saves}</>}
                                  {r.views === null && r.saves === null && "—"}
                                </td>
                                <td className="muted-sm">{timeAgo(new Date(r.updatedAt), lang)}</td>
                                <td style={{ textAlign: "right" }}>
                                  <ListingRowActions
                                    locale={lang}
                                    dict={dict}
                                    kind={r.kind}
                                    id={r.id}
                                    status={r.status}
                                    editHref={r.editHref}
                                    href={r.href}
                                    canRenew={r.canRenew}
                                    businessManaged={r.kind === "job" && !!r.note?.startsWith("🏢")}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function statusFilterLabel(f: StatusFilter, t: { statusLive: string; tileAttention: string; statusPaused: string; statusClosed: string }): string {
  switch (f) {
    case "live":
      return t.statusLive;
    case "attention":
      return t.tileAttention;
    case "paused":
      return t.statusPaused;
    case "closed":
      return t.statusClosed;
    default:
      return "";
  }
}
