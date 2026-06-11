import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, roleAtLeast } from "@/lib/dal";
import { db } from "@/lib/db";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { timeAgo } from "@/lib/format";
import { pmToHtml } from "@/lib/prosemirror";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: { select: { forumName: true } },
      category: true,
      _count: { select: { replies: true, votes: true } },
    },
  });
  if (!post) notFound();

  // Hidden posts are only visible to moderators/admins.
  if (post.hidden && !(user && roleAtLeast(user.role, "MODERATOR"))) notFound();

  // Locked categories: content is gated behind login.
  if (post.category.locked && !user) {
    redirect(`/${lang}/login?next=/${lang}/p/${slug}`);
  }

  const style = categoryStyle(post.category.slug);
  const html = pmToHtml(post.body);

  return (
    <>
      <Header locale={lang} dict={dict} user={user ? { forumName: user.forumName } : null} />
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

          <div className="post-actions" style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <span className="action">▲ {post._count.votes}</span>
            <span className="action">💬 {post._count.replies} {dict.home.comments}</span>
            <span className="action">{dict.post.share}</span>
          </div>
        </article>
      </main>
    </>
  );
}
