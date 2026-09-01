import Link from "@/components/Link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { timeAgo, postExcerpt } from "@/lib/format";
import { pmFirstImage } from "@/lib/prosemirror";
import { resolveAuthor } from "@/lib/anon";
import { Vote } from "@/components/Vote";
import { SaveButton } from "@/components/SaveButton";
import { DeletePostButton } from "@/components/DeletePostButton";
import { AuthorTag } from "@/components/AuthorTag";
import { ClickableCard } from "@/components/ClickableCard";
import { eventTiming, formatEventRange } from "@/lib/events";
import type { PostKind } from "@/generated/prisma/client";

// Shape of the posts produced by the home/category loaders.
export type FeedPost = {
  id: string;
  slug: string;
  title: string;
  body: unknown;
  score: number;
  myVote: number;
  saved: boolean;
  lastActivity: Date;
  authorId: string;
  anonAlias: number | null;
  quickPosted: boolean;
  kind: PostKind;
  eventStartsAt: Date | null;
  eventEndsAt: Date | null;
  eventLocation: string | null;
  author: { forumName: string };
  authorBusiness: { name: string; slug: string; logoUrl: string | null } | null;
  category: { nameEn: string; nameKa: string; slug: string };
  _count: { replies: number; votes: number; rsvps: number };
};

const GEORGIAN = /[Ⴀ-ჿ]/;
const RED_CHIP = new Set(["employment", "legal"]);

function PostCard({
  locale,
  dict,
  post,
  canVote,
  loginHref,
  canDelete,
}: {
  locale: Locale;
  dict: Dictionary;
  post: FeedPost;
  canVote: boolean;
  loginHref: string;
  canDelete: boolean;
}) {
  const style = categoryStyle(post.category.slug);
  const chipClass = RED_CHIP.has(post.category.slug) ? "chip chip-red" : "chip chip-blue";
  const excerpt = postExcerpt(post.body);
  const image = pmFirstImage(post.body);
  const showTranslate = locale === "en" && GEORGIAN.test(excerpt);
  // Feed never reveals real authors behind anonymous posts.
  const author = resolveAuthor(locale, {
    authorId: post.authorId,
    forumName: post.author.forumName,
    anonAlias: post.anonAlias,
    authorBusiness: post.authorBusiness,
  });

  const isEvent = post.kind === "EVENT" && !!post.eventStartsAt;
  const timing = isEvent ? eventTiming(post.eventStartsAt!, post.eventEndsAt) : null;

  const href = `/${locale}/p/${post.slug}`;

  return (
    <ClickableCard href={href} className={isEvent ? `post post-event post-event-${timing}` : "post"}>
      <div className="post-body">
        <div className="post-meta">
          {isEvent && (
            <span className="event-kind-tag" title={dict.events.tag}>
              🗓 {dict.events.tag}
            </span>
          )}
          <Link href={`/${locale}/c/${post.category.slug}`} className={chipClass}>
            <span className="dot" style={{ background: style.color }} />
            {categoryName(post.category, locale)}
          </Link>
          <span className="sep">·</span>
          by <AuthorTag author={author} />
          <span className="sep">·</span>
          {timeAgo(new Date(post.lastActivity), locale)}
          {post.quickPosted && (
            <span className="quick-flag" title={dict.feed.quickPostNote}>
              ⚠ {dict.feed.mayBeMoved}
            </span>
          )}
        </div>
        <h2 className="post-title">
          <Link href={`/${locale}/p/${post.slug}`}>{post.title}</Link>
        </h2>
        {isEvent && (
          <div className="event-card-when">
            🗓 {formatEventRange(post.eventStartsAt!, post.eventEndsAt, locale)}
            {post.eventLocation && <> · 📍 {post.eventLocation}</>}
            {timing === "live" && <span className="event-badge-live">{dict.events.happeningNow}</span>}
            {timing === "past" && <span className="event-badge-past">{dict.events.finished}</span>}
          </div>
        )}
        {excerpt && (
          <p className="post-excerpt">
            {GEORGIAN.test(excerpt) ? <span className="ka">{excerpt}</span> : excerpt}
          </p>
        )}
        {image && (
          <Link href={`/${locale}/p/${post.slug}`} className="post-card-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" loading="lazy" />
          </Link>
        )}
        <div className="post-actions">
          <Vote
            id={post.id}
            kind="post"
            initialScore={post.score}
            initialVote={post.myVote}
            canVote={canVote}
            loginHref={loginHref}
            orientation="horizontal"
          />
          <Link href={`/${locale}/p/${post.slug}`} className="action">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z" />
            </svg>
            {post._count.replies} {dict.home.comments}
          </Link>
          {isEvent && (
            <Link href={`/${locale}/p/${post.slug}`} className="action">
              ✓ {dict.events.goingCount.replace("{n}", String(post._count.rsvps))}
            </Link>
          )}
          <button className="action">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4" />
            </svg>
            {dict.common.share}
          </button>
          <SaveButton
            postId={post.id}
            initialSaved={post.saved}
            canSave={canVote}
            loginHref={loginHref}
            saveLabel={dict.common.save}
            savedLabel={dict.common.saved}
          />
          {showTranslate && (
            <button className="translate-hint">✦ {dict.home.translateToEnglish}</button>
          )}
          {canDelete && (
            <DeletePostButton
              postId={post.id}
              locale={locale}
              label={dict.mod.deletePost}
              confirmText={dict.mod.confirmDeletePost}
            />
          )}
        </div>
      </div>
    </ClickableCard>
  );
}

export function PostList({
  locale,
  dict,
  posts,
  canVote,
  loginHref,
  emptyMessage,
  canDelete = false,
}: {
  locale: Locale;
  dict: Dictionary;
  posts: FeedPost[];
  canVote: boolean;
  loginHref: string;
  emptyMessage?: string;
  canDelete?: boolean;
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
        <PostCard
          key={post.id}
          locale={locale}
          dict={dict}
          post={post}
          canVote={canVote}
          loginHref={loginHref}
          canDelete={canDelete}
        />
      ))}
    </>
  );
}
