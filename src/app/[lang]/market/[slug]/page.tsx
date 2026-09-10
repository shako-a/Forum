import Link from "@/components/Link";
import { RichText } from "@/components/RichText";
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
import { MARKET_CATEGORIES, MARKET_CONDITIONS, MARKET_PRICE_TYPES, iconOf, labelOf, isMarketExpired, canRenew } from "@/lib/market";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { mapsDirectionsUrl } from "@/lib/maps";
import { socialLinks, whatsappUrl } from "@/lib/business-social";
import { getFeaturedCards } from "@/lib/featured";
import type { ContactTarget } from "@/lib/modules";
import { Gallery } from "@/components/estate/Gallery";
import { MarketCard, marketPriceLabel } from "@/components/market/MarketCard";
import { FavoriteButton } from "@/components/market/FavoriteButton";
import { OwnerControls } from "@/components/market/OwnerControls";
import { ReportListingButton } from "@/components/market/ReportListingButton";
import { SellerReviewForm } from "@/components/market/SellerReviewForm";
import { Stars } from "@/components/business/Stars";
import { ShareMenu } from "@/components/ShareMenu";
import { ListingPage } from "@/components/listing/ListingPage";
import { ListingHero } from "@/components/listing/ListingHero";
import { ListingActions, type ListingAction } from "@/components/listing/ListingActions";
import { Section } from "@/components/listing/Section";
import { SpecTable } from "@/components/listing/SpecTable";
import { ContactCard } from "@/components/listing/ContactCard";
import { SocialCard } from "@/components/listing/SocialCard";
import { LocationCard } from "@/components/listing/LocationCard";
import { MessageForm } from "@/components/listing/MessageForm";
import { SimilarGrid } from "@/components/listing/SimilarGrid";
import { FeaturedBar } from "@/components/listing/FeaturedBar";

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
  const L = dict.listing;
  const l = listing;

  const isOwner = !!user && user.id === l.sellerId;
  const canManage = isOwner || user?.role === "ADMIN";
  if ((l.status === "PAUSED" || l.status === "REMOVED") && !canManage) notFound();
  if (!isOwner) countView(l.id);

  const [similarRaw, [me], rating, reviews, myReview, inTouch, featured] = await Promise.all([
    getSimilarListings(l),
    attachSaved([{ id: l.id }], user?.id),
    getSellerRating(l.sellerId),
    getSellerReviews(l.sellerId),
    getViewerSellerReview(l.sellerId, user?.id),
    user && !isOwner ? hasConversationBetween(user.id, l.sellerId) : Promise.resolve(false),
    getFeaturedCards("market", lang),
  ]);
  const canReview = !!user && !isOwner && inTouch;
  const similar = await attachSaved(similarRaw, user?.id);
  const expired = isMarketExpired(l.bumpedAt);
  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const href = `/${lang}/market/${l.slug}`;
  const loginHref = `/${lang}/login?next=${encodeURIComponent(href)}`;
  const target: ContactTarget = { module: "market", listingId: l.id };
  const biz = l.sellerBusiness;
  const wa = whatsappUrl(biz?.whatsapp);
  const bizAddress = biz ? [biz.address, biz.city, stateLabel(biz.state, lang)].filter(Boolean).join(", ") : "";
  const mapQuery = bizAddress || location;
  const dateStr = new Date(l.createdAt).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const phone = l.phone || biz?.phone || null;

  const actions = [
    phone && { kind: "call", href: `tel:${phone}`, label: L.call, icon: "📞", primary: true },
    wa && { kind: "whatsapp", href: wa, label: L.whatsapp, icon: "💬", external: true, className: "la-whatsapp" },
    biz?.email && { kind: "email", href: `mailto:${biz.email}`, label: L.email, icon: "✉️" },
    biz?.website && { kind: "website", href: biz.website, label: L.website, icon: "🌐", external: true },
    mapQuery && { kind: "directions", href: mapsDirectionsUrl(mapQuery), label: L.directions, icon: "📍", external: true },
  ].filter(Boolean) as ListingAction[];

  const details: Array<[string, React.ReactNode]> = [
    [t.condition, labelOf(MARKET_CONDITIONS, l.condition, lang)],
    [t.category, labelOf(MARKET_CATEGORIES, l.category, lang)],
    [t.price, labelOf(MARKET_PRICE_TYPES, l.priceType, lang)],
    [t.delivery, [l.localPickup && `🤝 ${t.localPickup}`, l.canShip && `📦 ${t.canShip}`].filter(Boolean).join(" · ") || "—"],
    ...(location ? [[dict.auth.city, location] as [string, string]] : []),
  ];

  const banners = (
    <>
      {l.status === "SOLD" && <div className="mk-status-banner mk-status-sold">✓ {t.soldBanner}</div>}
      {l.status === "PAUSED" && <div className="mk-status-banner">⏸ {t.pausedBanner}</div>}
      {l.status === "REMOVED" && (
        <div className="mk-status-banner mk-status-sold">🚫 {t.removedBanner}{l.removedReason ? ` — ${l.removedReason}` : ""}</div>
      )}
      {l.status === "ACTIVE" && expired && canManage && <div className="mk-status-banner">⌛ {t.expiredBanner}</div>}
    </>
  );

  return (
    <ListingPage
      locale={lang}
      dict={dict}
      user={toHeaderUser(user)}
      categories={allCategories}
      back={{ href: `/${lang}/market`, label: t.directory }}
      banners={banners}
      title={l.title}
      meta={[
        { icon: "📅", node: dateStr },
        {
          icon: "👤",
          node: biz ? (
            <Link href={`/${lang}/business/${biz.slug}`}>🏢 {biz.name}{biz.verified && " ✓"}</Link>
          ) : (
            <Link href={`/${lang}/u/${encodeURIComponent(l.seller.forumName)}`}>{l.seller.forumName}</Link>
          ),
        },
        ...(isOwner ? [{ icon: "👁", node: t.views.replace("{n}", String(l.views)) }, { icon: "♥", node: String(l._count.favorites) }] : []),
      ]}
      hero={
        <ListingHero
          media={l.photos.length > 0 ? <Gallery photos={l.photos} alt={l.title} /> : <div className="listing-hero-placeholder" aria-hidden="true"><span>{iconOf(MARKET_CATEGORIES, l.category)}</span></div>}
          badge={l.featured ? "TOP" : null}
          category={
            <>
              <Link href={`/${lang}/market?category=${l.category}`}>
                {iconOf(MARKET_CATEGORIES, l.category)} {labelOf(MARKET_CATEGORIES, l.category, lang)}
              </Link>
              {location && <> · {location}</>}
            </>
          }
          blurb={
            <>
              <div className="listing-price">
                {marketPriceLabel(l, t)}
                {l.priceType === "NEGOTIABLE" && <small>{t.negotiable}</small>}
              </div>
              <div className="listing-tags">
                <span className="mk-tag">{iconOf(MARKET_CONDITIONS, l.condition)} {labelOf(MARKET_CONDITIONS, l.condition, lang)}</span>
                {l.canShip && <span className="mk-tag">📦 {t.ships}</span>}
                <span className="mk-tag">{t.listed} {timeAgo(l.bumpedAt, lang)}</span>
              </div>
            </>
          }
          actions={
            <ListingActions
              target={target}
              actions={actions}
              messageHref={!isOwner ? "#message" : undefined}
              messageLabel={L.message}
              save={
                !isOwner ? (
                  <FavoriteButton listingId={l.id} saved={!!me?.saved} loggedIn={!!user} loginHref={loginHref} labels={{ save: t.save, saved: t.saved }} withLabel />
                ) : undefined
              }
              share={<ShareMenu title={l.title} dict={dict} />}
            />
          }
        />
      }
      main={
        <>
          {canManage && l.status !== "REMOVED" && (
            <div className="card card-pad mk-owner-card">
              <OwnerControls locale={lang} dict={dict} listingId={l.id} slug={l.slug} status={l.status} renewable={canRenew(l.bumpedAt)} expired={expired} />
            </div>
          )}
          <Section title={t.description} icon="📝">
            <RichText doc={l.descriptionRich} text={l.description} plainClassName="biz-description" />
          </Section>
          <Section title={t.details} icon="ℹ️">
            <SpecTable rows={details} />
          </Section>
          <Section title={t.reviews} icon="⭐">
            {reviews.length === 0 ? (
              <p className="biz-empty">{t.noRatings}</p>
            ) : (
              <ul className="mk-reviews">
                {reviews.map((rv) => (
                  <li key={rv.id} className="mk-review">
                    <div className="mk-review-head">
                      <Stars value={rv.rating} />
                      <Link href={`/${lang}/u/${encodeURIComponent(rv.reviewer.forumName)}`} className="mk-review-author">{rv.reviewer.forumName}</Link>
                      <span className="muted-sm">· {timeAgo(rv.createdAt, lang)}</span>
                      {rv.listing && (
                        <span className="muted-sm">· {t.aboutItem} <Link href={`/${lang}/market/${rv.listing.slug}`}>{rv.listing.title}</Link></span>
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
          </Section>
        </>
      }
      rail={
        <>
          <Section title={t.seller} icon="👤">
            <div className="mk-seller-id">
              {biz ? (
                <Link href={`/${lang}/business/${biz.slug}`} className="mk-seller-name">
                  🏢 {biz.name}
                  {biz.verified && <span className="biz-verified" title={dict.business.verified}> ✓</span>}
                </Link>
              ) : (
                <Link href={`/${lang}/u/${encodeURIComponent(l.seller.forumName)}`} className="mk-seller-name">{l.seller.forumName}</Link>
              )}
              <div className="muted-sm">
                {biz && <>{t.listedBy} {l.seller.forumName} · </>}
                {t.memberSince} {new Date(l.seller.createdAt).getFullYear()} · {t.activeListings.replace("{n}", String(l.seller._count.marketListings))}
              </div>
              <div className="mk-seller-rating">
                <Stars value={rating.avg} count={rating.count} />
                {rating.count === 0 && <span className="muted-sm"> {t.noRatings}</span>}
              </div>
            </div>
          </Section>
          <ContactCard
            title={L.contact}
            target={target}
            rows={[
              { icon: "📞", label: L.phone, value: phone, href: phone ? `tel:${phone}` : undefined, kind: "call" },
              { icon: "💬", label: L.whatsapp, value: biz?.whatsapp ?? null, href: wa ?? undefined, kind: "whatsapp", external: true },
              { icon: "✉️", label: L.email, value: biz?.email ?? null, href: biz?.email ? `mailto:${biz.email}` : undefined, kind: "email" },
              { icon: "🌐", label: L.website, value: biz?.website ? biz.website.replace(/^https?:\/\//, "") : null, href: biz?.website ?? undefined, kind: "website", external: true },
              { icon: "📍", label: L.address, value: bizAddress || location || null },
            ]}
          />
          {biz && <SocialCard title={L.social} target={target} links={socialLinks(biz)} />}
          <LocationCard title={L.location} query={mapQuery} address={bizAddress || undefined} mapTitle={dict.estate.mapTitle} openLabel={L.openInMaps} directionsLabel={L.directions} target={target} />
          <Section id="message" title={L.messageSeller} icon="✉️">
            <MessageForm target={target} locale={lang} dict={dict} loggedIn={!!user} isOwner={isOwner} canMessage loginHref={loginHref} />
            {!isOwner && (
              <div className="mk-report-row">
                <ReportListingButton locale={lang} dict={dict} listingId={l.id} loggedIn={!!user} loginHref={loginHref} />
              </div>
            )}
          </Section>
        </>
      }
      after={
        <>
          {similar.length > 0 && (
            <SimilarGrid title={t.similar}>
              {similar.map((s) => (
                <MarketCard key={s.id} locale={lang} dict={dict} listing={s} viewerId={user?.id} />
              ))}
            </SimilarGrid>
          )}
          <FeaturedBar cards={featured} eyebrow={L.featuredEyebrow} title={L.featuredTitle} viewAllHref={`/${lang}/market`} viewAllLabel={L.viewAll} locale={lang} />
        </>
      }
    />
  );
}
