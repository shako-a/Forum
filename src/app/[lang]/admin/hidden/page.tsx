import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";

// Hidden content stays on the server; admins can review what moderators removed.
export default async function AdminHiddenPage({ params }: PageProps<"/[lang]/admin/hidden">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const [posts, replies] = await Promise.all([
    db.post
      .findMany({
        where: { hidden: true },
        orderBy: { hiddenAt: "desc" },
        select: {
          id: true,
          title: true,
          hiddenAt: true,
          author: { select: { forumName: true } },
          hiddenBy: { select: { forumName: true } },
        },
        take: 100,
      })
      .catch(() => []),
    db.reply
      .findMany({
        where: { hidden: true },
        orderBy: { hiddenAt: "desc" },
        select: {
          id: true,
          hiddenAt: true,
          author: { select: { forumName: true } },
          hiddenBy: { select: { forumName: true } },
        },
        take: 100,
      })
      .catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.admin.hiddenContent}</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold opacity-70">Posts</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {posts.map((p) => (
            <li key={p.id} className="rounded-md border border-black/10 dark:border-white/10 px-3 py-2">
              <span className="font-medium">{p.title}</span>
              <span className="ml-2 opacity-60">
                by {p.author.forumName}
                {p.hiddenBy ? ` · hidden by ${p.hiddenBy.forumName}` : ""}
              </span>
            </li>
          ))}
          {posts.length === 0 && <li className="opacity-50">{dict.home.feedEmpty}</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold opacity-70">{dict.post.reply}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {replies.map((r) => (
            <li key={r.id} className="rounded-md border border-black/10 dark:border-white/10 px-3 py-2">
              <span className="opacity-60">
                by {r.author.forumName}
                {r.hiddenBy ? ` · hidden by ${r.hiddenBy.forumName}` : ""}
              </span>
            </li>
          ))}
          {replies.length === 0 && <li className="opacity-50">{dict.home.feedEmpty}</li>}
        </ul>
      </section>
    </div>
  );
}
