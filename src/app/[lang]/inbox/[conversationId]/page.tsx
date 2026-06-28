import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getConversation, getBlockState } from "@/lib/inbox-data";
import { markConversationRead } from "@/app/actions/inbox";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarkRead } from "@/components/inbox/MarkRead";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { DmActions } from "@/components/inbox/DmActions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params, searchParams }: PageProps<"/[lang]/inbox/[conversationId]">) {
  const { lang, conversationId } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const sp = await searchParams;
  const attachId = typeof sp.attach === "string" ? sp.attach : undefined;

  const [dict, allCategories, convo] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getConversation(conversationId, user.id),
  ]);
  if (!convo) notFound();
  const t = dict.inbox;
  const block = convo.otherId ? await getBlockState(user.id, convo.otherId) : { iBlocked: false, theyBlocked: false };
  const blocked = block.iBlocked || block.theyBlocked;

  // Pre-attach a post if "Text the Author" passed ?attach=<postId>.
  const attachPost = attachId
    ? await db.post.findFirst({
        where: { id: attachId, hidden: false },
        select: { id: true, slug: true, title: true, category: { select: { slug: true } } },
      })
    : null;
  const initialAttached = attachPost
    ? { id: attachPost.id, slug: attachPost.slug, title: attachPost.title, categorySlug: attachPost.category.slug }
    : null;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <MarkRead action={markConversationRead.bind(null, conversationId, lang)} when={true} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="dm-head">
            <Link href={`/${lang}/inbox?tab=messages`} className="dm-back" aria-label={t.back}>‹</Link>
            <Link href={`/${lang}/u/${encodeURIComponent(convo.other)}`} className="dm-head-id">
              <span className="dm-avatar" aria-hidden="true">{convo.other.charAt(0).toUpperCase()}</span>
              <span className="dm-head-name">{convo.other}</span>
            </Link>
            {convo.otherId && (
              <DmActions
                locale={lang}
                dict={dict}
                otherUserId={convo.otherId}
                conversationId={convo.id}
                iBlocked={block.iBlocked}
              />
            )}
          </div>

          <div className="dm-thread card card-pad">
            {convo.messages.length === 0 ? (
              <p className="inbox-empty">{t.sayHi}</p>
            ) : (
              convo.messages.map((m) => (
                <div key={m.id} className={`dm-msg${m.senderId === user.id ? " mine" : ""}`}>
                  {m.post && (
                    <Link href={`/${lang}/p/${m.post.slug}`} className="dm-post-ref">
                      <span className="dm-post-ref-cat">
                        {lang === "ka" ? m.post.category.nameKa : m.post.category.nameEn}
                      </span>
                      <span className="dm-post-ref-title">{m.post.title}</span>
                    </Link>
                  )}
                  {m.body && <span className="dm-bubble">{m.body}</span>}
                  <span className="dm-msg-time">{timeAgo(new Date(m.createdAt), lang)}</span>
                </div>
              ))
            )}
          </div>

          {blocked ? (
            <p className="dm-blocked-note">
              {block.iBlocked ? t.youBlocked : t.cannotReply}
            </p>
          ) : (
            <MessageComposer locale={lang} dict={dict} conversationId={convo.id} initialAttached={initialAttached} />
          )}
        </main>
      </div>
    </>
  );
}
