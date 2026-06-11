import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { timeAgo, postExcerpt } from "@/lib/format";

// Shape of the posts produced by the home/category loaders.
export type FeedPost = {
  id: string;
  slug: string;
  title: string;
  body: unknown;
  lastActivity: Date;
  author: { forumName: string };
  category: { nameEn: string; nameKa: string; slug: string };
  _count: { replies: number; votes: number };
};

const GEORGIAN = /[Ⴀ-ჿ]/;
const RED_CHIP = new Set(["employment", "legal"]);

function VoteRail({ count }: { count: number }) {
  return (
    <div className="vote-rail">
      <button className="vote-btn" aria-label="Upvote">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <span className="vote-count">{count}</span>
      <button className="vote-btn down" aria-label="Downvote">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function PostCard({ locale, dict, post }: { locale: Locale; dict: Dictionary; post: FeedPost }) {
  const style = categoryStyle(post.category.slug);
  const chipClass = RED_CHIP.has(post.category.slug) ? "chip chip-red" : "chip chip-blue";
  const excerpt = postExcerpt(post.body);
  const showTranslate = locale === "en" && GEORGIAN.test(excerpt);

  return (
    <article className="post">
      <VoteRail count={post._count.votes} />
      <div className="post-body">
        <div className="post-meta">
          <Link href={`/${locale}/c/${post.category.slug}`} className={chipClass}>
            <span className="dot" style={{ background: style.color }} />
            {categoryName(post.category, locale)}
          </Link>
          <span className="sep">·</span>
          by <Link href={`/${locale}/u/${post.author.forumName}`}>{post.author.forumName}</Link>
          <span className="sep">·</span>
          {timeAgo(new Date(post.lastActivity), locale)}
        </div>
        <h2 className="post-title">
          <Link href={`/${locale}/p/${post.slug}`}>{post.title}</Link>
        </h2>
        {excerpt && (
          <p className="post-excerpt">
            {GEORGIAN.test(excerpt) ? <span className="ka">{excerpt}</span> : excerpt}
          </p>
        )}
        <div className="post-actions">
          <Link href={`/${locale}/p/${post.slug}`} className="action">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z" />
            </svg>
            {post._count.replies} {dict.home.comments}
          </Link>
          <button className="action">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4" />
            </svg>
            {dict.common.share}
          </button>
          <button className="action">{dict.common.save}</button>
          {showTranslate && (
            <button className="translate-hint">✦ {dict.home.translateToEnglish}</button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PostList({
  locale,
  dict,
  posts,
  emptyMessage,
}: {
  locale: Locale;
  dict: Dictionary;
  posts: FeedPost[];
  emptyMessage?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
        {emptyMessage ?? dict.home.feedEmpty}
      </div>
    );
  }
  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} locale={locale} dict={dict} post={post} />
      ))}
    </>
  );
}
