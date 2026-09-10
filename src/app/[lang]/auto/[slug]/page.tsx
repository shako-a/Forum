import Link from "@/components/Link";
import { RichText } from "@/components/RichText";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getAutoListing, getSimilarAuto, countAutoView } from "@/lib/auto-data";
import { AUTO_BODY_TYPES, AUTO_TRANSMISSIONS, AUTO_FUELS, AUTO_DRIVETRAINS, AUTO_CONDITIONS, AUTO_FEATURES, autoIcon, autoLabel, formatMiles } from "@/lib/auto";
import { formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { mapsDirectionsUrl } from "@/lib/maps";
import { getFeaturedCards } from "@/lib/featured";
import type { ContactTarget } from "@/lib/modules";
import { Gallery } from "@/components/estate/Gallery";
import { AutoCard } from "@/components/auto/AutoCard";
import { AutoOwnerControls } from "@/components/auto/AutoOwnerControls";
import { ReportAutoButton } from "@/components/auto/ReportAutoButton";
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

export default async function AutoListingPage({ params }: PageProps<"/[lang]/auto/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user, allCategories, listing] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getAutoListing(slug),
  ]);
  if (!listing) notFound();
  const t = dict.auto;
  const m = dict.market;
  const L = dict.listing;
  const l = listing;
  const isOwner = !!user && user.id === l.ownerId;
  const canManage = isOwner || user?.role === "ADMIN";
  if ((l.status === "PAUSED" || l.status === "REMOVED") && !canManage) notFound();
  if (!isOwner) countAutoView(l.id);

  const [similar, featured] = await Promise.all([getSimilarAuto(l), getFeaturedCards("auto", lang)]);
  const isRent = l.kind === "RENT";
  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const href = `/${lang}/auto/${l.slug}`;
  const loginHref = `/${lang}/login?next=${encodeURIComponent(href)}`;
  const target: ContactTarget = { module: "auto", listingId: l.id };
  const features = AUTO_FEATURES.filter((f) => l.features.includes(f.key));
  const dateStr = new Date(l.createdAt).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const actions = [
    l.phone && { kind: "call", href: `tel:${l.phone}`, label: L.call, icon: "📞", primary: true },
    l.email && { kind: "email", href: `mailto:${l.email}`, label: L.email, icon: "✉️" },
    location && { kind: "directions", href: mapsDirectionsUrl(location), label: L.directions, icon: "📍", external: true },
  ].filter(Boolean) as ListingAction[];

  const specs: Array<[string, string]> = [];
  specs.push([t.kind, isRent ? t.forRent : t.forSale]);
  if (l.bodyType) specs.push([t.bodyType, `${autoIcon(AUTO_BODY_TYPES, l.bodyType)} ${autoLabel(AUTO_BODY_TYPES, l.bodyType, lang)}`]);
  specs.push([t.year, String(l.year)]);
  if (l.mileage != null) specs.push([t.mileage, formatMiles(l.mileage)]);
  if (l.transmission) specs.push([t.transmission, autoLabel(AUTO_TRANSMISSIONS, l.transmission, lang)]);
  if (l.fuel) specs.push([t.fuel, autoLabel(AUTO_FUELS, l.fuel, lang)]);
  if (l.drivetrain) specs.push([t.drivetrain, autoLabel(AUTO_DRIVETRAINS, l.drivetrain, lang)]);
  if (l.color) specs.push([t.color, l.color]);
  if (!isRent) specs.push([t.condition, autoLabel(AUTO_CONDITIONS, l.condition, lang)]);
  if (l.vin) specs.push(["VIN", l.vin]);
  if (isRent) {
    specs.push([t.insured, l.insured ? `🛡️ ${t.insuredYes}` : t.insuredNo]);
    if (l.minRentalDays) specs.push([t.minRentalDays, String(l.minRentalDays)]);
    if (l.depositAmount != null) specs.push([t.deposit, formatPrice(l.depositAmount)]);
  }

  const banners = (
    <>
      {l.status === "SOLD" && <div className="mk-status-banner mk-status-sold">✓ {isRent ? t.rentedBanner : t.soldBanner}</div>}
      {l.status === "PAUSED" && <div className="mk-status-banner">⏸ {m.pausedBanner}</div>}
      {l.status === "REMOVED" && <div className="mk-status-banner mk-status-sold">🚫 {m.removedBanner}{l.removedReason ? ` — ${l.removedReason}` : ""}</div>}
    </>
  );

  return (
    <ListingPage
      locale={lang}
      dict={dict}
      user={toHeaderUser(user)}
      categories={allCategories}
      back={{ href: `/${lang}/auto`, label: t.directory }}
      banners={banners}
      title={l.title}
      meta={[
        { icon: "📅", node: dateStr },
        { icon: "👤", node: <Link href={`/${lang}/u/${encodeURIComponent(l.owner.forumName)}`}>{l.contactName || l.owner.forumName}</Link> },
        ...(isOwner ? [{ icon: "👁", node: m.views.replace("{n}", String(l.views)) }] : []),
      ]}
      hero={
        <ListingHero
          media={l.photos.length > 0 ? <Gallery photos={l.photos} alt={l.title} /> : <div className="listing-hero-placeholder" aria-hidden="true"><span>{autoIcon(AUTO_BODY_TYPES, l.bodyType)}</span></div>}
          badge={l.featured ? "TOP" : null}
          category={
            <>
              <span className={`re-kind-badge ${isRent ? "re-kind-rent" : "re-kind-sale"}`}>{isRent ? t.forRent : t.forSale}</span>
              {l.bodyType && <> · {autoIcon(AUTO_BODY_TYPES, l.bodyType)} {autoLabel(AUTO_BODY_TYPES, l.bodyType, lang)}</>}
              {location && <> · {location}</>}
            </>
          }
          blurb={
            <>
              <div className="listing-price">
                {formatPrice(l.price)}
                {isRent && <small>{t.perDay}</small>}
                {l.negotiable && <small>{m.negotiable}</small>}
              </div>
              <div className="listing-tags">
                {l.mileage != null && <span className="mk-tag">🛣 {formatMiles(l.mileage)}</span>}
                {l.transmission && <span className="mk-tag">{autoLabel(AUTO_TRANSMISSIONS, l.transmission, lang)}</span>}
                {l.fuel && <span className="mk-tag">{autoLabel(AUTO_FUELS, l.fuel, lang)}</span>}
                {isRent && l.insured && <span className="mk-tag auto-insured">🛡️ {t.insuredShort}</span>}
                <span className="mk-tag">{m.listed} {timeAgo(l.createdAt, lang)}</span>
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
          {canManage && l.status !== "REMOVED" && (
            <div className="card card-pad mk-owner-card">
              <AutoOwnerControls locale={lang} dict={dict} listingId={l.id} slug={l.slug} kind={l.kind} status={l.status} />
            </div>
          )}
          <Section title={t.specs} icon="🔧">
            <SpecTable rows={specs} />
          </Section>
          {features.length > 0 && (
            <Section title={t.features} icon="✨">
              <div className="re-feature-list">
                {features.map((f) => (
                  <span key={f.key} className="re-feature-chip">{f.icon} {lang === "ka" ? f.ka : f.en}</span>
                ))}
              </div>
            </Section>
          )}
          {l.description && (
            <Section title={t.description} icon="📝">
              <RichText doc={l.descriptionRich} text={l.description} plainClassName="biz-description" />
            </Section>
          )}
        </>
      }
      rail={
        <>
          <ContactCard
            title={dict.estate.contact}
            target={target}
            rows={[
              { icon: "👤", label: L.postedBy, value: <>{l.contactName || l.owner.forumName} <span className="muted-sm">· {m.memberSince} {new Date(l.owner.createdAt).getFullYear()}</span></>, href: `/${lang}/u/${encodeURIComponent(l.owner.forumName)}` },
              { icon: "📞", label: L.phone, value: l.phone, href: l.phone ? `tel:${l.phone}` : undefined, kind: "call" },
              { icon: "✉️", label: L.email, value: l.email, href: l.email ? `mailto:${l.email}` : undefined, kind: "email" },
              { icon: "📍", label: L.address, value: location || null },
            ]}
          />
          <LocationCard title={L.location} query={location} mapTitle={dict.estate.mapTitle} openLabel={L.openInMaps} directionsLabel={L.directions} target={target} />
          <Section id="message" title={L.messageSeller} icon="✉️">
            <MessageForm target={target} locale={lang} dict={dict} loggedIn={!!user} isOwner={isOwner} canMessage loginHref={loginHref} />
            {!isOwner && (
              <div className="mk-report-row">
                <ReportAutoButton locale={lang} dict={dict} listingId={l.id} loggedIn={!!user} loginHref={loginHref} />
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
                <AutoCard key={s.id} locale={lang} dict={dict} listing={s} />
              ))}
            </SimilarGrid>
          )}
          <FeaturedBar cards={featured} eyebrow={L.featuredEyebrow} title={L.featuredTitle} viewAllHref={`/${lang}/auto`} viewAllLabel={L.viewAll} locale={lang} />
        </>
      }
    />
  );
}
