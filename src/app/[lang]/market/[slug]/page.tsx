import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import {
  getMarketListing,
  getSimilarListings,
  attachSaved,
  countView,
  getSellerRating,
  getSellerReviews,
  getViewerSellerReview,
  hasConversationBetween,
} from "@/lib/market-data";
import {
  MARKET_CATEGORIES,
  MARKET_CONDITIONS,
  MARKET_PRICE_TYPES,
  iconOf,
  labelOf,
  isMarketExpired,
  canRenew,
} from "@/lib/market";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { startConversation } from "@/app/actions/inbox";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Gallery } from "@/components/estate/Gallery";
import { MarketCard, marketPriceLabel } from "@/components/market/MarketCard";
import { FavoriteButton } from "@/components/market/FavoriteButton";
import { OwnerControls } from "@/components/market/OwnerControls";
import { ReportListingButton } from "@/components/market/ReportListingButton";
import { SellerReviewForm } from "@/components/market/SellerReviewForm";
import { Stars } from "@/components/business/Stars";

export const dynamic = "force-dynamic";

export default async function MarketListingPage({ params }: PageProps<"/[lang]/market/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user, allCategories, listing] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMarketListing(slug),
  ]);
  if (!listing) notFound();
  const t = dict.market;
  const l = listing;

  const isOwner = !!user && user.id === l.sellerId;
  const canManage = isOwner || user?.role === "ADMIN";
  // Paused = the seller hid it. Sold stays visible (people who saved it should
  // learn it's gone); expired stays reachable by link, just out of search.
  if ((l.status === "PAUSED" || l.status === "REMOVED") && !canManage) notFound();
  if (!isOwner) countView(l.id);

  const [similarRaw, [me], rating, reviews, myReview, inTouch] = await Promise.all([
    getSimilarListings(l),
    attachSaved([{ id: l.id }], user?.id),
    getSellerRating(l.sellerId),
    getSellerReviews(l.sellerId),
    getViewerSellerReview(l.sellerId, user?.id),
    user && !isOwner ? hasConversationBetween(user.id, l.sellerId) : Promise.resolve(false),
  ]);
  const canReview = !!user && !isOwner && inTouch;
  const similar = await attachSaved(similarRaw, user?.id);
  const expired = isMarketExpired(l.bumpedAt);
  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const href = `/${lang}/market/${l.slug}`;

  // Opens (or resumes) a DM thread with the seller through the forum inbox.
  async function messageSeller() {
    "use server";
    await startConversation(l!.sellerId, lang);
  }

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market`} className="btn btn-ghost btn-sm biz-back">‹ {t.directory}</Link>

          {l.status === "SOLD" && <div className="mk-status-banner mk-status-sold">✓ {t.soldBanner}</div>}
          {l.status === "PAUSED" && <div className="mk-status-banner">⏸ {t.pausedBanner}</div>}
          {l.status === "REMOVED" && (
            <div className="mk-status-banner mk-status-sold">
              🚫 {t.removedBanner}{l.removedReason ? ` — ${l.removedReason}` : ""}
            </div>
          )}
          {l.status === "ACTIVE" && expired && canManage && (
            <div className="mk-status-banner">⌛ {t.expiredBanner}</div>
          )}

          {l.photos.length > 0 && <Gallery photos={l.photos} alt={l.title} />}

          {/* Title / price / actions */}
          <div className="card card-pad mk-detail-head">
            <div className="mk-detail-main">
              <div className="mk-detail-price">
                {marketPriceLabel(l, t)}
                {l.priceType === "NEGOTIABLE" && <span className="mk-card-obo">{t.negotiable}</span>}
              </div>
              <h1 className="mk-detail-title">{l.title}</h1>
              <div className="mk-detail-tags">
                <span className="mk-tag">{iconOf(MARKET_CONDITIONS, l.condition)} {labelOf(MARKET_CONDITIONS, l.condition, lang)}</span>
                <Link href={`/${lang}/market?category=${l.category}`} className="mk-tag">
                  {iconOf(MARKET_CATEGORIES, l.category)} {labelOf(MARKET_CATEGORIES, l.category, lang)}
                </Link>
                {location && <span className="mk-tag">📍 {location}</span>}
              </div>
              <div className="biz-card-meta">
                <span>{t.listed} {timeAgo(l.bumpedAt, lang)}</span>
                {isOwner && (
                  <>
                    <span className="sep">·</span>
                    <span>👁 {t.views.replace("{n}", String(l.views))}</span>
                    <span className="sep">·</span>
                    <span>♥ {l._count.favorites}</span>
                  </>
                )}
              </div>
            </div>
            <div className="mk-detail-side">
              {!isOwner && (
                <FavoriteButton
                  listingId={l.id}
                  saved={!!me?.saved}
                  loggedIn={!!user}
                  loginHref={`/${lang}/login?next=${encodeURIComponent(href)}`}
                  labels={{ save: t.save, saved: t.saved }}
                  withLabel
                />
              )}
            </div>
          </div>

          {canManage && l.status !== "REMOVED" && (
            <div className="card card-pad mk-owner-card">
              <OwnerControls
                locale={lang}
                dict={dict}
                listingId={l.id}
                slug={l.slug}
                status={l.status}
                renewable={canRenew(l.bumpedAt)}
                expired={expired}
              />
            </div>
          )}

          {/* Description */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">📝 {t.description}</h2>
            <p className="biz-description">{l.description}</p>
          </div>

          {/* Details */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">ℹ️ {t.details}</h2>
            <dl className="mk-details">
              <dt>{t.condition}</dt>
              <dd>{labelOf(MARKET_CONDITIONS, l.condition, lang)}</dd>
              <dt>{t.category}</dt>
              <dd>{labelOf(MARKET_CATEGORIES, l.category, lang)}</dd>
              <dt>{t.price}</dt>
              <dd>{labelOf(MARKET_PRICE_TYPES, l.priceType, lang)}</dd>
              <dt>{t.delivery}</dt>
              <dd>
                {[l.localPickup && `🤝 ${t.localPickup}`, l.canShip && `📦 ${t.canShip}`].filter(Boolean).join(" · ") || "—"}
              </dd>
              {location && (
                <>
                  <dt>{dict.auth.city}</dt>
                  <dd>{location}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Seller */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">👤 {t.seller}</h2>
            <div className="mk-seller">
              <div className="mk-seller-id">
                {l.sellerBusiness ? (
                  <Link href={`/${lang}/business/${l.sellerBusiness.slug}`} className="mk-seller-name">
                    🏢 {l.sellerBusiness.name}
                    {l.sellerBusiness.verified && <span className="biz-verified" title={dict.business.verified}> ✓</span>}
                  </Link>
                ) : (
                  <Link href={`/${lang}/u/${encodeURIComponent(l.seller.forumName)}`} className="mk-seller-name">
                    {l.seller.forumName}
                  </Link>
                )}
                <div className="muted-sm">
                  {l.sellerBusiness && <>{t.listedBy} {l.seller.forumName} · </>}
                  {t.memberSince} {new Date(l.seller.createdAt).getFullYear()} · {t.activeListings.replace("{n}", String(l.seller._count.marketListings))}
                </div>
                <div className="mk-seller-rating">
                  <Stars value={rating.avg} count={rating.count} />
                  {rating.count === 0 && <span className="muted-sm"> {t.noRatings}</span>}
                </div>
              </div>
              {!isOwner && (
                <div className="mk-seller-actions">
                  {user ? (
                    <form action={messageSeller}>
                      <button type="submit" className="btn btn-primary">💬 {t.messageSeller}</button>
                    </form>
                  ) : (
                    <Link href={`/${lang}/login?next=${encodeURIComponent(href)}`} className="btn btn-primary">
                      💬 {t.messageSeller}
                    </Link>
                  )}
                  {l.phone && (
                    <a href={`tel:${l.phone}`} className="btn btn-ghost">📞 {l.phone}</a>
                  )}
                </div>
              )}
            </div>
            {!isOwner && (
              <div className="mk-report-row">
                <ReportListingButton
                  locale={lang}
                  dict={dict}
                  listingId={l.id}
                  loggedIn={!!user}
                  loginHref={`/${lang}/login?next=${encodeURIComponent(href)}`}
                />
              </div>
            )}
          </div>

          {/* Seller reviews */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">⭐ {t.reviews}</h2>
            {reviews.length === 0 ? (
              <p className="biz-empty">{t.noRatings}</p>
            ) : (
              <ul className="mk-reviews">
                {reviews.map((rv) => (
                  <li key={rv.id} className="mk-review">
                    <div className="mk-review-head">
                      <Stars value={rv.rating} />
                      <Link href={`/${lang}/u/${encodeURIComponent(rv.reviewer.forumName)}`} className="mk-review-author">
                        {rv.reviewer.forumName}
                      </Link>
                      <span className="muted-sm">· {timeAgo(rv.createdAt, lang)}</span>
                      {rv.listing && (
                        <span className="muted-sm">
                          · {t.aboutItem} <Link href={`/${lang}/market/${rv.listing.slug}`}>{rv.listing.title}</Link>
                        </span>
                      )}
                    </div>
                    {rv.body && <p className="mk-review-body">{rv.body}</p>}
                  </li>
                ))}
              </ul>
            )}
            {canReview ? (
              <div className="mk-review-you">
                <h3 className="mk-review-you-title">{myReview ? t.reviewUpdate : t.rateSeller}</h3>
                <SellerReviewForm locale={lang} dict={dict} sellerId={l.sellerId} listingId={l.id} existing={myReview} />
              </div>
            ) : (
              !isOwner && <p className="muted-sm mk-review-hint">💬 {t.reviewHint}</p>
            )}
          </div>

          {/* Similar */}
          {similar.length > 0 && (
            <div className="biz-section">
              <h2 className="biz-section-title" style={{ padding: "0 4px 8px" }}>🔎 {t.similar}</h2>
              <div className="mk-grid">
                {similar.map((s) => (
                  <MarketCard key={s.id} locale={lang} dict={dict} listing={s} viewerId={user?.id} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
