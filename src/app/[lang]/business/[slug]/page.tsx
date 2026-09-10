import Link from "@/components/Link";
import { RichText } from "@/components/RichText";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getBusinessProfile, avgRating } from "@/lib/business-data";
import { getBusinessPosts } from "@/lib/forum-data";
import { canManageBusiness } from "@/lib/business-manage";
import { businessCategoryLabel, businessCategoryIcon } from "@/lib/business-categories";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { mapsDirectionsUrl } from "@/lib/maps";
import { socialLinks, whatsappUrl, parseDetails, keyedLabel, LANGUAGES, PAYMENT_METHODS } from "@/lib/business-social";
import { getFeaturedCards, getSimilarBusinesses, countBusinessView } from "@/lib/featured";
import type { ContactTarget } from "@/lib/modules";
import { PostList } from "@/components/PostList";
import { Gallery } from "@/components/estate/Gallery";
import { Stars } from "@/components/business/Stars";
import { ReviewForm } from "@/components/business/ReviewForm";
import { ReviewReply } from "@/components/business/ReviewReply";
import { BusinessCard } from "@/components/business/BusinessCard";
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

export default async function BusinessProfilePage({ params }: PageProps<"/[lang]/business/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user, allCategories, biz] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getBusinessProfile(slug),
  ]);
  if (!biz) notFound();
  const t = dict.business;
  const L = dict.listing;

  const isOwner = !!user && user.id === biz.owner.id;
  const canManage = user ? await canManageBusiness(user.id, biz.id, user.role === "ADMIN") : false;
  if (!isOwner) countBusinessView(biz.id);

  const [businessPosts, similar, featured] = await Promise.all([
    getBusinessPosts(biz.id, user?.id ?? null),
    getSimilarBusinesses(biz),
    getFeaturedCards("business", lang),
  ]);
  const myReview = user ? biz.reviews.find((r) => r.authorId === user.id) : undefined;

  const location = [biz.city, stateLabel(biz.state, lang)].filter(Boolean).join(", ");
  const fullAddress = [biz.address, biz.city, stateLabel(biz.state, lang), biz.zip].filter(Boolean).join(", ");
  const target: ContactTarget = { module: "business", listingId: biz.id };
  const wa = whatsappUrl(biz.whatsapp);
  const social = socialLinks(biz);
  const details = parseDetails(biz.details);
  let bookingHost: string | null = null;
  if (biz.bookingUrl) {
    try { bookingHost = new URL(biz.bookingUrl).hostname.replace(/^www\./, ""); } catch { bookingHost = L.booking; }
  }
  const href = `/${lang}/business/${biz.slug}`;
  const loginHref = `/${lang}/login?next=${encodeURIComponent(href)}`;
  const dateStr = new Date(biz.createdAt).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const actions = [
    biz.phone && { kind: "call", href: `tel:${biz.phone}`, label: L.call, icon: "📞", primary: true },
    wa && { kind: "whatsapp", href: wa, label: L.whatsapp, icon: "💬", external: true, className: "la-whatsapp" },
    biz.email && { kind: "email", href: `mailto:${biz.email}`, label: L.email, icon: "✉️" },
    biz.website && { kind: "website", href: biz.website, label: L.website, icon: "🌐", external: true },
    biz.bookingUrl && { kind: "booking", href: biz.bookingUrl, label: L.booking, icon: "📅", external: true },
    fullAddress && { kind: "directions", href: mapsDirectionsUrl(fullAddress), label: L.directions, icon: "📍", external: true },
  ].filter(Boolean) as ListingAction[];

  const media =
    biz.photos.length > 0 ? (
      <Gallery photos={biz.photos} alt={biz.name} />
    ) : (
      <div className="listing-hero-placeholder" aria-hidden="true">
        {biz.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={biz.logoUrl} alt="" />
        ) : (
          <span>{businessCategoryIcon(biz.category)}</span>
        )}
      </div>
    );

  return (
    <ListingPage
      locale={lang}
      dict={dict}
      user={toHeaderUser(user)}
      categories={allCategories}
      back={{ href: `/${lang}/business`, label: t.directory }}
      title={
        <>
          {biz.name}
          {biz.verified && <span className="biz-verified" title={t.verified}>✓</span>}
        </>
      }
      meta={[
        { icon: "📅", node: dateStr },
        { icon: "👤", node: <Link href={`/${lang}/u/${encodeURIComponent(biz.owner.forumName)}`}>{biz.owner.forumName}</Link> },
        { icon: "⭐", node: <a href="#reviews">{L.reviewsCount.replace("{n}", String(biz.ratingCount))}</a> },
      ]}
      hero={
        <ListingHero
          media={media}
          badge={biz.featured ? "TOP" : null}
          manage={canManage ? <Link href={`${href}/manage`} className="btn btn-ghost btn-sm">{t.manage}</Link> : null}
          category={
            <>
              <Link href={`/${lang}/business?category=${biz.category}`}>
                {businessCategoryIcon(biz.category)} {businessCategoryLabel(biz.category, lang)}
              </Link>
              {location && <> · {location}</>}
            </>
          }
          blurb={
            <>
              {biz.tagline && <p style={{ margin: "0 0 6px" }}>{biz.tagline}</p>}
              <Stars value={avgRating(biz)} count={biz.ratingCount} />
            </>
          }
          actions={
            <ListingActions
              target={target}
              actions={actions}
              messageHref={!isOwner ? "#message" : undefined}
              messageLabel={L.message}
              share={<ShareMenu title={biz.name} dict={dict} />}
            />
          }
        />
      }
      main={
        <>
          {biz.description && (
            <Section title={L.aboutBusiness} icon="📝">
              <RichText doc={biz.descriptionRich} text={biz.description} plainClassName="biz-description" />
            </Section>
          )}

          {details.length > 0 && (
            <Section title={businessCategoryLabel(biz.category, lang)} icon={businessCategoryIcon(biz.category)}>
              <SpecTable rows={details.map((d) => [d.label, d.value])} />
            </Section>
          )}

          {businessPosts.length > 0 && (
            <Section title={t.posts} icon="📝" plain>
              <PostList
                locale={lang}
                dict={dict}
                posts={businessPosts}
                canVote={!!user}
                loginHref={loginHref}
                canDelete={user?.role === "ADMIN"}
              />
            </Section>
          )}

          {biz.jobs.length > 0 && (
            <Section title={t.openJobs} icon="💼">
              {biz.jobs.map((j) => (
                <div key={j.id} className="biz-job">
                  <h3 className="biz-job-title">
                    <Link href={`/${lang}/jobs/${j.id}`}>{j.title}</Link>
                  </h3>
                  <RichText doc={j.descriptionRich} text={j.description} plainClassName="biz-job-desc" />
                  {(j.city || j.state) && <p className="biz-job-loc">📍 {[j.city, j.state].filter(Boolean).join(", ")}</p>}
                </div>
              ))}
            </Section>
          )}

          <Section id="reviews" title={`${L.reviews} (${biz.ratingCount})`} icon="⭐">
            {biz.reviews.length === 0 ? (
              <p className="biz-empty">{L.noReviewsYet}</p>
            ) : (
              <ul className="biz-review-list">
                {biz.reviews.map((r) => (
                  <li key={r.id} className="biz-review">
                    <div className="biz-review-head">
                      <Link href={`/${lang}/u/${encodeURIComponent(r.author.forumName)}`} className="biz-review-author">
                        {r.author.forumName}
                      </Link>
                      <Stars value={r.rating} />
                      <span className="biz-review-time">{timeAgo(new Date(r.createdAt), lang)}</span>
                    </div>
                    {r.body && <p className="biz-review-body">{r.body}</p>}
                    {r.ownerReply && (
                      <div className="biz-review-owner">
                        <span className="biz-review-owner-label">🏢 {t.businessReplied}</span>
                        <p className="biz-review-owner-body">{r.ownerReply}</p>
                      </div>
                    )}
                    {canManage && <ReviewReply locale={lang} reviewId={r.id} existing={r.ownerReply} dict={dict} />}
                  </li>
                ))}
              </ul>
            )}

            {user && !isOwner && (
              <div className="biz-review-mine" style={{ marginTop: 14 }}>
                <p className="biz-review-prompt">{myReview ? t.yourReview : L.writeReview}</p>
                <ReviewForm
                  locale={lang}
                  dict={dict}
                  businessId={biz.id}
                  initialRating={myReview?.rating ?? 0}
                  initialBody={myReview?.body ?? ""}
                />
              </div>
            )}
            {!user && (
              <p className="biz-review-login" style={{ marginTop: 12 }}>
                <Link href={loginHref}>{t.loginToReview}</Link>
              </p>
            )}
          </Section>
        </>
      }
      rail={
        <>
          <ContactCard
            title={L.contact}
            target={target}
            rows={[
              { icon: "📞", label: L.phone, value: biz.phone, href: biz.phone ? `tel:${biz.phone}` : undefined, kind: "call" },
              { icon: "💬", label: L.whatsapp, value: biz.whatsapp, href: wa ?? undefined, kind: "whatsapp", external: true },
              { icon: "✉️", label: L.email, value: biz.email, href: biz.email ? `mailto:${biz.email}` : undefined, kind: "email" },
              { icon: "🌐", label: L.website, value: biz.website ? biz.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null, href: biz.website ?? undefined, kind: "website", external: true },
              { icon: "📅", label: L.booking, value: bookingHost, href: biz.bookingUrl ?? undefined, kind: "booking", external: true },
              { icon: "📍", label: L.address, value: fullAddress || null },
            ]}
          />
          <SocialCard title={L.social} target={target} links={social} />
          <LocationCard
            title={L.location}
            query={fullAddress || location}
            address={biz.address ? fullAddress : undefined}
            mapTitle={dict.estate.mapTitle}
            openLabel={L.openInMaps}
            directionsLabel={L.directions}
            target={target}
          />
          {(biz.languages.length > 0 || biz.paymentMethods.length > 0) && (
            <Section title={L.details}>
              <SpecTable
                rows={
                  [
                    biz.languages.length > 0 && [L.languages, biz.languages.map((k) => keyedLabel(LANGUAGES, k, lang)).join(", ")],
                    biz.paymentMethods.length > 0 && [L.payments, biz.paymentMethods.map((k) => keyedLabel(PAYMENT_METHODS, k, lang)).join(", ")],
                  ].filter(Boolean) as Array<[string, string]>
                }
              />
            </Section>
          )}
          <Section id="message" title={L.messageTitle} icon="✉️">
            <MessageForm target={target} locale={lang} dict={dict} loggedIn={!!user} isOwner={isOwner} canMessage loginHref={loginHref} />
          </Section>
        </>
      }
      after={
        <>
          {similar.length > 0 && (
            <SimilarGrid title={L.similarBusinesses}>
              {similar.map((b) => (
                <BusinessCard key={b.id} locale={lang} dict={dict} business={b} />
              ))}
            </SimilarGrid>
          )}
          <FeaturedBar cards={featured} eyebrow={L.featuredEyebrow} title={L.featuredTitle} viewAllHref={`/${lang}/business`} viewAllLabel={L.viewAll} locale={lang} />
        </>
      }
    />
  );
}
