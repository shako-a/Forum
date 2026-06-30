import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName, adTitle } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { getForumStats } from "@/lib/forum-data";
import type { Category, AdCard } from "@/generated/prisma/client";

// Compact count: 4 → "4", 12400 → "12.4k".
function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

// A sidebar ad: video takes priority over image; optional title + click-through.
function AdMediaCard({ ad, locale }: { ad: AdCard; locale: Locale }) {
  const title = adTitle(ad, locale);
  const inner = (
    <>
      {ad.videoUrl ? (
        <video
          className="sidebar-ad-media"
          src={ad.videoUrl}
          muted
          loop
          autoPlay
          playsInline
        />
      ) : ad.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sidebar-ad-media" src={ad.imageUrl} alt="" />
      ) : null}
      {title && <div className="sidebar-ad-title">{title}</div>}
    </>
  );
  return ad.linkUrl ? (
    <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="card sidebar-ad">
      {inner}
    </a>
  ) : (
    <div className="card sidebar-ad">{inner}</div>
  );
}

export async function RightSidebar({
  locale,
  dict,
  user,
  categories,
  ads,
}: {
  locale: Locale;
  dict: Dictionary;
  user: { forumName: string } | null;
  categories: Category[];
  ads: AdCard[];
}) {
  const stats = await getForumStats();
  return (
    <aside className="rail">
      {/* Welcome / hero card */}
      <div className="card welcome-card">
        <div className="banner" aria-hidden="true" />
        <div className="card-pad">
          <h3>{dict.home.welcomeTitle}</h3>
          <p>{dict.home.welcomeBody}</p>
          {!user && (
            <Link href={`/${locale}/signup`} className="btn btn-primary" style={{ width: "100%", display: "block", textAlign: "center" }}>
              {dict.home.createAccount}
            </Link>
          )}
          <div className="stat-row" style={{ marginTop: user ? 0 : 16 }}>
            <div className="stat"><b>{fmtCount(stats.members)}</b><span>{dict.home.members}</span></div>
            <div className="stat"><b>{fmtCount(stats.online)}</b><span>{dict.home.online}</span></div>
            <div className="stat"><b>{fmtCount(stats.topics)}</b><span>{dict.home.topics}</span></div>
          </div>
        </div>
      </div>

      {/* Sidebar ad slot — admin-managed image/video ads. Falls back to the
          popular-communities list when no sidebar ad is configured. */}
      {ads.length > 0 ? (
        ads.map((ad) => <AdMediaCard key={ad.id} ad={ad} locale={locale} />)
      ) : (
        <div className="card card-pad">
          <h3>{dict.home.popularCommunities}</h3>
          <div className="comm-list">
            {categories.slice(0, 4).map((c) => {
              const style = categoryStyle(c.slug);
              return (
                <Link key={c.id} href={`/${locale}/c/${c.slug}`} className="comm">
                  <span className="comm-icon" style={{ background: `${style.color}1f`, color: style.color }}>
                    {style.icon}
                  </span>
                  <span>
                    <span className="comm-name">{categoryName(c, locale)}</span>
                  </span>
                  {c.locked && !user && <span className="lock">🔒</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* App promo */}
      <div className="card card-pad app-card">
        <h3>{dict.home.appCardTitle}</h3>
        <p>{dict.home.appCardBody}</p>
        <div className="store-badges">
          <a className="store-badge" href="#"> {dict.home.appStore}</a>
          <a className="store-badge" href="#">▶ {dict.home.googlePlay}</a>
        </div>
      </div>

      <div className="footer-links">
        <Link href={`/${locale}/about`}>{dict.footer.about}</Link> ·{" "}
        <Link href={`/${locale}/community-rules`}>{dict.footer.rules}</Link> ·{" "}
        <Link href={`/${locale}/moderators`}>{dict.footer.moderators}</Link> ·{" "}
        <Link href={`/${locale}/privacy`}>{dict.footer.privacy}</Link> ·{" "}
        <Link href={`/${locale}/contact`}>{dict.footer.contact}</Link>
        <br />
        {dict.footer.copyright}
      </div>
    </aside>
  );
}
