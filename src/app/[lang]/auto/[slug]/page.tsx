import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getAutoListing, getSimilarAuto, countAutoView } from "@/lib/auto-data";
import {
  AUTO_BODY_TYPES,
  AUTO_TRANSMISSIONS,
  AUTO_FUELS,
  AUTO_DRIVETRAINS,
  AUTO_CONDITIONS,
  AUTO_FEATURES,
  autoIcon,
  autoLabel,
  formatMiles,
} from "@/lib/auto";
import { formatPrice } from "@/lib/estate";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { startConversation } from "@/app/actions/inbox";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Gallery } from "@/components/estate/Gallery";
import { AutoCard } from "@/components/auto/AutoCard";
import { AutoOwnerControls } from "@/components/auto/AutoOwnerControls";
import { ReportAutoButton } from "@/components/auto/ReportAutoButton";

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
  const l = listing;
  const isOwner = !!user && user.id === l.ownerId;
  const canManage = isOwner || user?.role === "ADMIN";
  if ((l.status === "PAUSED" || l.status === "REMOVED") && !canManage) notFound();
  if (!isOwner) countAutoView(l.id);

  const similar = await getSimilarAuto(l);
  const isRent = l.kind === "RENT";
  const location = [l.city, stateLabel(l.state, lang)].filter(Boolean).join(", ");
  const href = `/${lang}/auto/${l.slug}`;
  const features = AUTO_FEATURES.filter((f) => l.features.includes(f.key));

  async function messageSeller() {
    "use server";
    await startConversation(l!.ownerId, lang);
  }

  const specs: Array<[string, string]> = [];
  if (l.bodyType) specs.push([t.bodyType, `${autoIcon(AUTO_BODY_TYPES, l.bodyType)} ${autoLabel(AUTO_BODY_TYPES, l.bodyType, lang)}`]);
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

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/auto`} className="btn btn-ghost btn-sm biz-back">‹ {t.directory}</Link>

          {l.status === "SOLD" && <div className="mk-status-banner mk-status-sold">✓ {isRent ? t.rentedBanner : t.soldBanner}</div>}
          {l.status === "PAUSED" && <div className="mk-status-banner">⏸ {m.pausedBanner}</div>}
          {l.status === "REMOVED" && (
            <div className="mk-status-banner mk-status-sold">🚫 {m.removedBanner}{l.removedReason ? ` — ${l.removedReason}` : ""}</div>
          )}

          {l.photos.length > 0 && <Gallery photos={l.photos} alt={l.title} />}

          <div className="card card-pad mk-detail-head">
            <div className="mk-detail-main">
              <div className="mk-detail-price">
                {formatPrice(l.price)}
                {isRent && <span className="re-card-permo">{t.perDay}</span>}
                {l.negotiable && <span className="mk-card-obo">{m.negotiable}</span>}
              </div>
              <h1 className="mk-detail-title">{l.title}</h1>
              <div className="mk-detail-tags">
                <span className={`re-kind-badge ${isRent ? "re-kind-rent" : "re-kind-sale"}`}>{isRent ? t.forRent : t.forSale}</span>
                {l.bodyType && <span className="mk-tag">{autoIcon(AUTO_BODY_TYPES, l.bodyType)} {autoLabel(AUTO_BODY_TYPES, l.bodyType, lang)}</span>}
                {l.mileage != null && <span className="mk-tag">🛣 {formatMiles(l.mileage)}</span>}
                {isRent && l.insured && <span className="mk-tag auto-insured">🛡️ {t.insuredShort}</span>}
                {location && <span className="mk-tag">📍 {location}</span>}
                {l.featured && <span className="mk-tag">★ {dict.estate.featured}</span>}
              </div>
              <div className="biz-card-meta">
                <span>{m.listed} {timeAgo(l.createdAt, lang)}</span>
                {isOwner && <><span className="sep">·</span><span>👁 {m.views.replace("{n}", String(l.views))}</span></>}
              </div>
            </div>
          </div>

          {canManage && l.status !== "REMOVED" && (
            <div className="card card-pad mk-owner-card">
              <AutoOwnerControls locale={lang} dict={dict} listingId={l.id} slug={l.slug} kind={l.kind} status={l.status} />
            </div>
          )}

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">🔧 {t.specs}</h2>
            <dl className="mk-details">
              {specs.map(([k, v]) => (
                <span key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </span>
              ))}
            </dl>
          </div>

          {features.length > 0 && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">✨ {t.features}</h2>
              <div className="re-feature-list">
                {features.map((f) => (
                  <span key={f.key} className="re-feature-chip">{f.icon} {lang === "ka" ? f.ka : f.en}</span>
                ))}
              </div>
            </div>
          )}

          {l.description && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">📝 {t.description}</h2>
              <p className="biz-description">{l.description}</p>
            </div>
          )}

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">☎️ {dict.estate.contact}</h2>
            <div className="mk-seller">
              <div className="mk-seller-id">
                <Link href={`/${lang}/u/${encodeURIComponent(l.owner.forumName)}`} className="mk-seller-name">
                  {l.contactName || l.owner.forumName}
                </Link>
                <div className="muted-sm">
                  {l.contactName && <>{dict.estate.postedBy} {l.owner.forumName} · </>}
                  {m.memberSince} {new Date(l.owner.createdAt).getFullYear()} · {m.activeListings.replace("{n}", String(l.owner._count.autoListings))}
                </div>
              </div>
              {!isOwner && (
                <div className="mk-seller-actions">
                  {user ? (
                    <form action={messageSeller}>
                      <button type="submit" className="btn btn-primary">💬 {m.messageSeller}</button>
                    </form>
                  ) : (
                    <Link href={`/${lang}/login?next=${encodeURIComponent(href)}`} className="btn btn-primary">💬 {m.messageSeller}</Link>
                  )}
                  {l.phone && <a href={`tel:${l.phone}`} className="btn btn-ghost">📞 {l.phone}</a>}
                  {l.email && <a href={`mailto:${l.email}`} className="btn btn-ghost">✉ {l.email}</a>}
                </div>
              )}
            </div>
            {!isOwner && (
              <div className="mk-report-row">
                <ReportAutoButton locale={lang} dict={dict} listingId={l.id} loggedIn={!!user} loginHref={`/${lang}/login?next=${encodeURIComponent(href)}`} />
              </div>
            )}
          </div>

          {similar.length > 0 && (
            <div className="biz-section">
              <h2 className="biz-section-title" style={{ padding: "0 4px 8px" }}>🔎 {t.similar}</h2>
              <div className="mk-grid">
                {similar.map((s) => <AutoCard key={s.id} locale={lang} dict={dict} listing={s} />)}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
