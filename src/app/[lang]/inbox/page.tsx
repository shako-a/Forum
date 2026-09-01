import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getNotifications, getConversations, getInboxUnread } from "@/lib/inbox-data";
import { markNotificationsRead } from "@/app/actions/inbox";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { MarkRead } from "@/components/inbox/MarkRead";

export const dynamic = "force-dynamic";

const NOTIF_ICON: Record<string, string> = {
  reply: "💬",
  mention: "@",
  review: "⭐",
  system: "🔔",
};

export default async function InboxPage({ params, searchParams }: PageProps<"/[lang]/inbox">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const sp = await searchParams;
  const tab = sp.tab === "messages" ? "messages" : "notifications";

  const [dict, allCategories, unread] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getInboxUnread(),
  ]);
  const t = dict.inbox;

  const [notifications, conversations] = await Promise.all([
    tab === "notifications" ? getNotifications(user.id) : Promise.resolve([]),
    tab === "messages" ? getConversations(user.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      {/* Mark notifications read when viewing that tab. */}
      {tab === "notifications" && (
        <MarkRead action={markNotificationsRead.bind(null, lang)} when={unread.notifications > 0} />
      )}
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <h1 className="account-title">{t.title}</h1>

          <div className="inbox-tabs">
            <Link
              href={`/${lang}/inbox?tab=notifications`}
              className={`inbox-tab${tab === "notifications" ? " active" : ""}`}
            >
              🔔 {t.notifications}
              {unread.notifications > 0 && <span className="inbox-tab-badge">{unread.notifications}</span>}
            </Link>
            <Link
              href={`/${lang}/inbox?tab=messages`}
              className={`inbox-tab${tab === "messages" ? " active" : ""}`}
            >
              ✉ {t.messages}
              {unread.messages > 0 && <span className="inbox-tab-badge">{unread.messages}</span>}
            </Link>
          </div>

          {tab === "notifications" ? (
            notifications.length === 0 ? (
              <div className="card card-pad inbox-empty">{t.noNotifications}</div>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link href={`/${lang}${n.url}`} className={`notif${n.read ? "" : " unread"}`}>
                      <span className="notif-ico" aria-hidden="true">{NOTIF_ICON[n.type] ?? "🔔"}</span>
                      <span className="notif-body">
                        <span className="notif-text">
                          {n.actor ? <strong>{n.actor.forumName}</strong> : <strong>{t.someone}</strong>}{" "}
                          {t[`verb_${n.type}` as keyof typeof t] ?? t.verb_system}{" "}
                          <span className="notif-target">{n.title}</span>
                        </span>
                        {n.body && <span className="notif-snippet">{n.body}</span>}
                        <span className="notif-time">{timeAgo(new Date(n.createdAt), lang)}</span>
                      </span>
                      {!n.read && <span className="notif-dot" aria-hidden="true" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : conversations.length === 0 ? (
            <div className="card card-pad inbox-empty">{t.noMessages}</div>
          ) : (
            <ul className="dm-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link href={`/${lang}/inbox/${c.id}`} className={`dm-row${c.unread ? " unread" : ""}`}>
                    <span className="dm-avatar" aria-hidden="true">{c.other.charAt(0).toUpperCase()}</span>
                    <span className="dm-row-body">
                      <span className="dm-row-name">{c.other}</span>
                      <span className="dm-row-last">
                        {c.fromSelf && <span className="dm-you">{t.you}: </span>}
                        {c.lastBody}
                      </span>
                    </span>
                    <span className="dm-row-time">{timeAgo(new Date(c.lastAt), lang)}</span>
                    {c.unread && <span className="notif-dot" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}
