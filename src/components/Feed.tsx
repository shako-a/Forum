import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { PostList, type FeedPost } from "@/components/PostList";

export type { FeedPost };

export function Feed({
  locale,
  dict,
  user,
  posts,
}: {
  locale: Locale;
  dict: Dictionary;
  user: { forumName: string } | null;
  posts: FeedPost[];
}) {
  const initial = user ? user.forumName.charAt(0).toUpperCase() : "✦";
  const composerHref = user ? `/${locale}/create` : `/${locale}/login`;

  return (
    <main className="feed">
      {/* Composer */}
      <div className="composer">
        <span className="avatar" style={{ background: "var(--blue)" }}>
          {initial}
        </span>
        <Link
          href={composerHref}
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
        <Link href={composerHref} className="btn btn-primary">
          {dict.common.post}
        </Link>
      </div>

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
        <select aria-label="City" defaultValue="">
          <option value="">{dict.feed.allCities}</option>
          <option>New York / NJ</option>
          <option>Tbilisi</option>
          <option>London</option>
          <option>Los Angeles</option>
        </select>
      </div>

      {/* Posts */}
      <PostList
        locale={locale}
        dict={dict}
        posts={posts}
        canVote={!!user}
        loginHref={`/${locale}/login`}
      />
    </main>
  );
}
