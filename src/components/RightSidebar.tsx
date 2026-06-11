import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName, adTitle } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import type { Category, AdCard } from "@/generated/prisma/client";

export function RightSidebar({
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
            <div className="stat"><b>12.4k</b><span>{dict.home.members}</span></div>
            <div className="stat"><b>1.8k</b><span>{dict.home.online}</span></div>
            <div className="stat"><b>46</b><span>{dict.home.countries}</span></div>
          </div>
        </div>
      </div>

      {/* Popular communities */}
      <div className="card card-pad">
        <h3>{dict.home.popularCommunities}</h3>
        <div className="comm-list">
          {categories.slice(0, 6).map((c) => {
            const style = categoryStyle(c.slug);
            return (
              <Link key={c.id} href={`/${locale}/c/${c.slug}`} className="comm">
                <span className="comm-icon" style={{ background: `${style.color}1f`, color: style.color }}>
                  {style.icon}
                </span>
                <span>
                  <span className="comm-name">{categoryName(c, locale)}</span>
                </span>
                {c.locked ? (
                  <span className="lock">🔒</span>
                ) : (
                  <span className="join">{dict.common.join}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin-managed sidebar ad cards (if any) */}
      {ads.map((ad) => (
        <a key={ad.id} href={ad.linkUrl ?? "#"} className="card card-pad" style={{ fontWeight: 600 }}>
          {adTitle(ad, locale)}
        </a>
      ))}

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
        <a href="#">{dict.footer.about}</a> · <a href="#">{dict.footer.rules}</a> ·{" "}
        <a href="#">{dict.footer.moderators}</a> · <a href="#">{dict.footer.privacy}</a> ·{" "}
        <a href="#">{dict.footer.contact}</a>
        <br />
        {dict.footer.copyright}
      </div>
    </aside>
  );
}
