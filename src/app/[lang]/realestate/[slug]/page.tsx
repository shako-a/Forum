import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getListing, countEstateView } from "@/lib/estate-data";
import { ReportEstateButton } from "@/components/estate/ReportEstateButton";
import {
  propertyTypeIcon,
  propertyTypeLabel,
  featureIcon,
  featureLabel,
  formatPrice,
} from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Gallery } from "@/components/estate/Gallery";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: PageProps<"/[lang]/realestate/[slug]">) {
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
  const l = listing;

  const isOwner = !!user && user.id === l.owner.id;
  const canManage = isOwner || user?.role === "ADMIN";
  // Unlisted listings stay reachable for their owner (and admins) only.
  if (!l.active && !canManage) notFound();
  if (!isOwner) countEstateView(l.id);

  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const fullAddress = [l.address, l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  // Keyless Google Maps embed + outbound link, both driven by the address text.
  const mapsQuery = encodeURIComponent(fullAddress);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`;

  const facts: Array<[string, string]> = [];
  if (l.bedrooms != null) facts.push(["🛏", `${l.bedrooms} ${t.bedrooms}`]);
  if (l.bathrooms != null) facts.push(["🛁", `${l.bathrooms} ${t.bathrooms}`]);
  if (l.rooms != null) facts.push(["🚪", `${l.rooms} ${t.rooms}`]);
  if (l.areaSqFt != null) facts.push(["📐", `${l.areaSqFt.toLocaleString("en-US")} ${t.sqft}`]);
  if (l.yearBuilt != null) facts.push(["🏗", `${t.yearBuilt}: ${l.yearBuilt}`]);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/realestate`} className="btn btn-ghost btn-sm biz-back">
            ‹ {t.directory}
          </Link>

          {!l.active && (
            <div className="card card-pad re-unlisted-banner">⚠️ {t.unlistedBanner}</div>
          )}

          {/* Gallery */}
          {l.photos.length > 0 && <Gallery photos={l.photos} alt={l.title} />}

          {/* Title / price */}
          <div className="card card-pad re-head">
            <div className="re-head-main">
              <div className="re-card-toprow">
                <span className="re-detail-price">
                  {formatPrice(l.price)}
                  {l.kind === "RENT" && <span className="re-card-permo">{t.perMonth}</span>}
                </span>
                <span className={`re-kind-badge ${l.kind === "RENT" ? "re-kind-rent" : "re-kind-sale"}`}>
                  {l.kind === "RENT" ? t.forRent : t.forSale}
                </span>
              </div>
              <h1 className="re-detail-title">{l.title}</h1>
              <div className="re-card-meta">
                <span>{propertyTypeIcon(l.propertyType)} {propertyTypeLabel(l.propertyType, lang)}</span>
                <span className="sep">·</span>
                <span>{t.posted} {timeAgo(l.createdAt, lang)}</span>
                {isOwner && (
                  <>
                    <span className="sep">·</span>
                    <span>👁 {dict.market.views.replace("{n}", String(l.views))}</span>
                  </>
                )}
                {l.featured && (
                  <>
                    <span className="sep">·</span>
                    <span className="biz-featured">★ {t.featured}</span>
                  </>
                )}
              </div>
              {facts.length > 0 && (
                <div className="re-detail-facts">
                  {facts.map(([icon, text]) => (
                    <span key={text} className="re-fact">{icon} {text}</span>
                  ))}
                </div>
              )}
            </div>
            {canManage && (
              <Link href={`/${lang}/realestate/${l.slug}/edit`} className="btn btn-ghost biz-manage">
                ✏️ {dict.business.manage}
              </Link>
            )}
          </div>

          {/* Address + map */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">📍 {t.address}</h2>
            <p className="re-address">
              {fullAddress}
              {" · "}
              <a href={mapsHref} target="_blank" rel="noopener noreferrer nofollow">
                {t.openInMaps} ↗
              </a>
            </p>
            <div className="re-map">
              <iframe
                src={mapsEmbed}
                title={t.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          {/* Features */}
          {l.features.length > 0 && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">✨ {t.features}</h2>
              <div className="re-feature-list">
                {l.features.map((f) => (
                  <span key={f} className="re-feature-chip">
                    {featureIcon(f)} {featureLabel(f, lang)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {l.description && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">📝 {t.description}</h2>
              <p className="biz-description">{l.description}</p>
            </div>
          )}

          {/* Contacts */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">☎️ {t.contact}</h2>
            <div className="re-contacts">
              <Link href={`/${lang}/u/${encodeURIComponent(l.owner.forumName)}`} className="biz-contact-item">
                👤 {l.contactName || l.owner.forumName}
                <span className="muted-sm"> · {t.postedBy} {l.owner.forumName}</span>
              </Link>
              {l.phone && <a href={`tel:${l.phone}`} className="biz-contact-item">📞 {l.phone}</a>}
              {l.email && <a href={`mailto:${l.email}`} className="biz-contact-item">✉ {l.email}</a>}
              {location && <span className="biz-contact-item">📍 {location}</span>}
            </div>
            {!isOwner && (
              <div className="mk-report-row">
                <ReportEstateButton
                  locale={lang}
                  dict={dict}
                  listingId={l.id}
                  loggedIn={!!user}
                  loginHref={`/${lang}/login?next=${encodeURIComponent(`/${lang}/realestate/${l.slug}`)}`}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
