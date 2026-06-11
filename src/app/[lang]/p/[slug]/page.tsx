import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, roleAtLeast } from "@/lib/dal";
import { getPostView } from "@/lib/forum-data";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { timeAgo } from "@/lib/format";
import { pmToHtml } from "@/lib/prosemirror";
import { Header } from "@/components/Header";
import { Vote } from "@/components/Vote";
import { ShareMenu } from "@/components/ShareMenu";
import { ReplyComposer } from "@/components/ReplyComposer";
import { ReplyThread } from "@/components/ReplyThread";
import { ReplySort, type ReplySortKey } from "@/components/ReplySort";

export const dynamic = "force-dynamic";

export default async function PostPage({ params, searchParams }: PageProps<"/[lang]/p/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const sort: ReplySortKey = sp.sort === "new" || sp.sort === "old" ? sp.sort : "best";

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const viewer = user ? { id: user.id, role: user.role } : null;
  const data = await getPostView(slug, viewer, sort);
  if (!data) notFound();

  const { post, postMyVote, replyCount, roots } = data;

  // Hidden posts: moderators/admins only.
  if (post.hidden && !(user && roleAtLeast(user.role, "MODERATOR"))) notFound();
  // Locked category: gated for guests.
  if (post.category.locked && !user) redirect(`/${lang}/login?next=/${lang}/p/${slug}`);

  const style = categoryStyle(post.category.slug);
  const html = pmToHtml(post.body);
  const isMod = !!user && roleAtLeast(user.role, "MODERATOR");
  const canReply = !!user && (!post.repliesLocked || isMod);
  const loginHref = `/${lang}/login?next=/${lang}/p/${slug}`;
  const headerUser = user ? { forumName: user.forumName } : null;

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <main className="create-wrap">
        <article>
          <div className="post-meta" style={{ marginBottom: 12 }}>
            <Link href={`/${lang}/c/${post.category.slug}`} className="chip chip-blue">
              <span className="dot" style={{ background: style.color }} />
              {categoryName(post.category, lang)}
            </Link>
            <span className="sep">·</span>
            by <Link href={`/${lang}/u/${post.author.forumName}`}>{post.author.forumName}</Link>
            <span className="sep">·</span>
            {timeAgo(new Date(post.createdAt), lang)}
          </div>

          <h1 className="post-title" style={{ fontSize: 26, marginBottom: 16 }}>
            {post.title}
          </h1>

          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

          {/* Action bar: vote · comments · share */}
          <div
            className="post-actions"
            style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 14, gap: 10 }}
          >
            <Vote
              id={post.id}
              kind="post"
              initialScore={post.score}
              initialVote={postMyVote}
              canVote={!!user}
              loginHref={loginHref}
              orientation="horizontal"
            />
            <span className="action">
              💬 {replyCount} {dict.home.comments}
            </span>
            <ShareMenu title={post.title} dict={dict} />
          </div>
        </article>

        {/* Replies */}
        <section id="replies" style={{ marginTop: 28, scrollMarginTop: 80 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
              {dict.post.replies} · {replyCount}
            </h2>
            {replyCount > 1 && <ReplySort current={sort} dict={dict} />}
          </div>

          {!user ? (
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <Link href={loginHref}>{dict.post.loginToReply}</Link>
            </div>
          ) : post.repliesLocked && !isMod ? (
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
              🔒 {dict.post.repliesLocked}
            </p>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <ReplyComposer locale={lang} slug={slug} postId={post.id} dict={dict} />
            </div>
          )}

          <ReplyThread
            roots={roots}
            locale={lang}
            slug={slug}
            postId={post.id}
            dict={dict}
            canVote={!!user}
            canReply={canReply}
            canModerate={isMod}
            loginHref={loginHref}
            shareTitle={post.title}
          />
        </section>
      </main>
    </>
  );
}
