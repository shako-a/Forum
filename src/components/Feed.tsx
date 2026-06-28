import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { PostList, type FeedPost } from "@/components/PostList";
import { QuickPostComposer } from "@/components/QuickPostComposer";
import type { AliasOption } from "@/components/IdentityPicker";
import {
  US_STATES,
  GEORGIA_VALUE,
  GEORGIA_FLAG,
  USA_VALUE,
  USA_FLAG,
  georgiaName,
  usaName,
} from "@/lib/us-states";

export type { FeedPost };

export function Feed({
  locale,
  dict,
  user,
  posts,
  aliases,
  canDelete = false,
}: {
  locale: Locale;
  dict: Dictionary;
  user: { forumName: string } | null;
  posts: FeedPost[];
  aliases: AliasOption[];
  canDelete?: boolean;
}) {
  return (
    <main className="feed">
      {/* Composer: inline quick-post for members; login prompt for guests */}
      {user ? (
        <QuickPostComposer locale={locale} dict={dict} realName={user.forumName} aliases={aliases} />
      ) : (
        <div className="composer">
          <span className="avatar" style={{ background: "var(--blue)" }}>
            ✦
          </span>
          <Link
            href={`/${locale}/login`}
            style={{
              flex: 1,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              borderRadius: 999,
              padding: "10px 16px",
              color: "var(--muted)",
            }}
          >
            {dict.feed.composerPlaceholder}
          </Link>
          <Link href={`/${locale}/login`} className="btn btn-primary">
            {dict.common.post}
          </Link>
        </div>
      )}

      {/* Tabs + city filter */}
      <div className="feed-tabs">
        <button className="tab active">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.7-2.5-.7-2.5S17 11 17 14a5 5 0 01-10 0c0-5 5-7 5-11z" />
          </svg>
          {dict.feed.tabHot}
        </button>
        <button className="tab">{dict.feed.tabNew}</button>
        <button className="tab">{dict.feed.tabTop}</button>
        <span className="spacer" />
        <select aria-label="Location" defaultValue="">
          <option value="">{dict.feed.allCities}</option>
          <option value={GEORGIA_VALUE}>{GEORGIA_FLAG} {georgiaName(locale)}</option>
          <option value={USA_VALUE}>{USA_FLAG} {usaName(locale)}</option>
          {US_STATES.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name} ({s.abbr})
            </option>
          ))}
        </select>
      </div>

      {/* Posts */}
      <PostList
        locale={locale}
        dict={dict}
        posts={posts}
        canVote={!!user}
        loginHref={`/${locale}/login`}
        canDelete={canDelete}
      />
    </main>
  );
}
