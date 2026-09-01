import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, getModeratedCategoryIds } from "@/lib/dal";
import { db } from "@/lib/db";
import { UnhideButton } from "@/components/admin/UnhideButton";

// Hidden content stays on the server. Admins review everything; a moderator
// only sees hidden content in the categories they moderate. (Layout already
// gated this route to admins + granted moderators.)
export default async function AdminHiddenPage({ params }: PageProps<"/[lang]/admin/hidden">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin;

  const me = await getCurrentUser();
  const isAdmin = me?.role === "ADMIN";
  const modCatIds = isAdmin || !me ? [] : await getModeratedCategoryIds(me.id);
  // Admins: all hidden. Moderators: only their categories' hidden content.
  const postWhere = isAdmin
    ? { hidden: true }
    : { hidden: true, categoryId: { in: modCatIds } };
  const replyWhere = isAdmin
    ? { hidden: true }
    : { hidden: true, post: { categoryId: { in: modCatIds } } };

  const [posts, replies] = await Promise.all([
    db.post
      .findMany({
        where: postWhere,
        orderBy: { hiddenAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          author: { select: { forumName: true } },
          hiddenBy: { select: { forumName: true } },
        },
        take: 100,
      })
      .catch(() => []),
    db.reply
      .findMany({
        where: replyWhere,
        orderBy: { hiddenAt: "desc" },
        select: {
          id: true,
          author: { select: { forumName: true } },
          hiddenBy: { select: { forumName: true } },
          post: { select: { slug: true, title: true } },
        },
        take: 100,
      })
      .catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="admin-h1">{t.hiddenContent}</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold opacity-70">{t.posts}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md border border-black/10 dark:border-white/10 px-3 py-2"
            >
              <span className="min-w-0">
                <Link href={`/${lang}/p/${p.slug}`} className="font-medium underline">{p.title}</Link>
                <span className="ml-2 opacity-60">
                  by {p.author.forumName}
                  {p.hiddenBy ? ` · hidden by ${p.hiddenBy.forumName}` : ""}
                </span>
              </span>
              <UnhideButton kind="post" id={p.id} locale={lang} slug={p.slug} dict={dict} />
            </li>
          ))}
          {posts.length === 0 && <li className="opacity-50">{t.nothingHidden}</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold opacity-70">{dict.post.replies}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {replies.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border border-black/10 dark:border-white/10 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="opacity-60">
                  by {r.author.forumName}
                  {r.hiddenBy ? ` · hidden by ${r.hiddenBy.forumName}` : ""} · on{" "}
                </span>
                <Link href={`/${lang}/p/${r.post.slug}`} className="underline">{r.post.title}</Link>
              </span>
              <UnhideButton kind="reply" id={r.id} locale={lang} slug={r.post.slug} dict={dict} />
            </li>
          ))}
          {replies.length === 0 && <li className="opacity-50">{t.nothingHidden}</li>}
        </ul>
      </section>
    </div>
  );
}
