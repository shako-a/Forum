import Link from "@/components/Link";
import { RichText } from "@/components/RichText";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getListing, countEstateView } from "@/lib/estate-data";
import { propertyTypeIcon, propertyTypeLabel, featureIcon, featureLabel, formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { mapsDirectionsUrl } from "@/lib/maps";
import { getFeaturedCards, getSimilarEstate } from "@/lib/featured";
import type { ContactTarget } from "@/lib/modules";
import { Gallery } from "@/components/estate/Gallery";
import { ListingCard } from "@/components/estate/ListingCard";
import { ReportEstateButton } from "@/components/estate/ReportEstateButton";
import { ShareMenu } from "@/components/ShareMenu";
import { ListingPage } from "@/components/listing/ListingPage";
import { ListingHero } from "@/components/listing/ListingHero";
import { ListingActions, type ListingAction } from "@/components/listing/ListingActions";
import { Section } from "@/components/listing/Section";
import { SpecTable } from "@/components/listing/SpecTable";
import { ContactCard } from "@/components/listing/ContactCard";
import { LocationCard } from "@/components/listing/LocationCard";
import { MessageForm } from "@/components/listing/MessageForm";
import { SimilarGrid } from "@/components/listing/SimilarGrid";
import { FeaturedBar } from "@/components/listing/FeaturedBar";

export const dynamic = "force-dynamic";

export default async function ListingPageRoute({ params }: PageProps<"/[lang]/realestate/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user, allCategories, listing] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getListing(slug),
  ]);
  if (!listing) notFound();
  const t = dict.estate;
  const L = dict.listing;
  const l = listing;

  const isOwner = !!user && user.id === l.owner.id;
  const canManage = isOwner || user?.role === "ADMIN";
  if (!l.active && !canManage) notFound();
  if (!isOwner) countEstateView(l.id);

  const [similar, featured] = await Promise.all([getSimilarEstate(l), getFeaturedCards("estate", lang)]);

  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const fullAddress = [l.address, l.city, stateLabel(l.state, lang), l.zip].filter(Boolean).join(", ");
  const href = `/${lang}/realestate/${l.slug}`;
  const loginHref = `/${lang}/login?next=${encodeURIComponent(href)}`;
  const target: ContactTarget = { module: "estate", listingId: l.id };
  const dateStr = new Date(l.createdAt).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const actions = [
    l.phone && { kind: "call", href: `tel:${l.phone}`, label: L.call, icon: "📞", primary: true },
    l.email && { kind: "email", href: `mailto:${l.email}`, label: L.email, icon: "✉️" },
    fullAddress && { kind: "directions", href: mapsDirectionsUrl(fullAddress), label: L.directions, icon: "📍", external: true },
  ].filter(Boolean) as ListingAction[];

  const facts: Array<[string, string]> = [];
  facts.push([t.kind, l.kind === "RENT" ? t.forRent : t.forSale]);
  facts.push([t.propertyType, `${propertyTypeIcon(l.propertyType)} ${propertyTypeLabel(l.propertyType, lang)}`]);
  if (l.bedrooms != null) facts.push([t.bedrooms, String(l.bedrooms)]);
  if (l.bathrooms != null) facts.push([t.bathrooms, String(l.bathrooms)]);
  if (l.rooms != null) facts.push([t.rooms, String(l.rooms)]);
  if (l.areaSqFt != null) facts.push([t.area, `${l.areaSqFt.toLocaleString("en-US")} ${t.sqft}`]);
  if (l.yearBuilt != null) facts.push([t.yearBuilt, String(l.yearBuilt)]);

  return (
    <ListingPage
      locale={lang}
      dict={dict}
      user={toHeaderUser(user)}
      categories={allCategories}
      back={{ href: `/${lang}/realestate`, label: t.directory }}
      banners={!l.active ? <div className="card card-pad re-unlisted-banner">⚠️ {t.unlistedBanner}</div> : null}
      title={l.title}
      meta={[
        { icon: "📅", node: dateStr },
        { icon: "👤", node: <Link href={`/${lang}/u/${encodeURIComponent(l.owner.forumName)}`}>{l.contactName || l.owner.forumName}</Link> },
        ...(isOwner ? [{ icon: "👁", node: L.views.replace("{n}", String(l.views)) }] : []),
      ]}
      hero={
        <ListingHero
          media={l.photos.length > 0 ? <Gallery photos={l.photos} alt={l.title} /> : <div className="listing-hero-placeholder" aria-hidden="true"><span>{propertyTypeIcon(l.propertyType)}</span></div>}
          badge={l.featured ? "TOP" : null}
          manage={canManage ? <Link href={`${href}/edit`} className="btn btn-ghost btn-sm">✏️ {dict.business.manage}</Link> : null}
          category={
            <>
              <span className={`re-kind-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"}`}>{l.kind === "RENT" ? t.forRent : t.forSale}</span>
              {" · "}
              {propertyTypeIcon(l.propertyType)} {propertyTypeLabel(l.propertyType, lang)}
              {location && <> · {location}</>}
            </>
          }
          blurb={
            <>
              <div className="listing-price">
                {formatPrice(l.price)}
                {l.kind === "RENT" && <small>{t.perMonth}</small>}
              </div>
              <div className="listing-tags">
                {l.bedrooms != null && <span className="mk-tag">🛏 {l.bedrooms} {t.bd}</span>}
                {l.bathrooms != null && <span className="mk-tag">🛁 {l.bathrooms} {t.ba}</span>}
                {l.areaSqFt != null && <span className="mk-tag">📐 {l.areaSqFt.toLocaleString("en-US")} {t.sqft}</span>}
                <span className="mk-tag">{t.posted} {timeAgo(l.createdAt, lang)}</span>
              </div>
            </>
          }
          actions={
            <ListingActions
              target={target}
              actions={actions}
              messageHref={!isOwner ? "#message" : undefined}
              messageLabel={L.message}
              share={<ShareMenu title={l.title} dict={dict} />}
            />
          }
        />
      }
      main={
        <>
          {l.description && (
            <Section title={t.description} icon="📝">
              <RichText doc={l.descriptionRich} text={l.description} plainClassName="biz-description" />
            </Section>
          )}
          <Section title={L.details} icon="ℹ️">
            <SpecTable rows={facts} />
          </Section>
          {l.features.length > 0 && (
            <Section title={t.features} icon="✨">
              <div className="re-feature-list">
                {l.features.map((f) => (
                  <span key={f} className="re-feature-chip">{featureIcon(f)} {featureLabel(f, lang)}</span>
                ))}
              </div>
            </Section>
          )}
        </>
      }
      rail={
        <>
          <ContactCard
            title={t.contact}
            target={target}
            rows={[
              { icon: "👤", label: L.postedBy, value: l.contactName || l.owner.forumName, href: `/${lang}/u/${encodeURIComponent(l.owner.forumName)}` },
              { icon: "📞", label: L.phone, value: l.phone, href: l.phone ? `tel:${l.phone}` : undefined, kind: "call" },
              { icon: "✉️", label: L.email, value: l.email, href: l.email ? `mailto:${l.email}` : undefined, kind: "email" },
              { icon: "📍", label: t.address, value: fullAddress || null },
            ]}
          />
          <LocationCard
            title={L.location}
            query={fullAddress || location}
            address={fullAddress || undefined}
            mapTitle={t.mapTitle}
            openLabel={t.openInMaps}
            directionsLabel={L.directions}
            target={target}
          />
          <Section id="message" title={L.messagePoster} icon="✉️">
            <MessageForm target={target} locale={lang} dict={dict} loggedIn={!!user} isOwner={isOwner} canMessage loginHref={loginHref} />
            {!isOwner && (
              <div className="mk-report-row">
                <ReportEstateButton locale={lang} dict={dict} listingId={l.id} loggedIn={!!user} loginHref={loginHref} />
              </div>
            )}
          </Section>
        </>
      }
      after={
        <>
          {similar.length > 0 && (
            <SimilarGrid title={L.similar}>
              {similar.map((s) => (
                <ListingCard key={s.id} locale={lang} dict={dict} listing={s} />
              ))}
            </SimilarGrid>
          )}
          <FeaturedBar cards={featured} eyebrow={L.featuredEyebrow} title={L.featuredTitle} viewAllHref={`/${lang}/realestate`} viewAllLabel={L.viewAll} locale={lang} />
        </>
      }
    />
  );
}
