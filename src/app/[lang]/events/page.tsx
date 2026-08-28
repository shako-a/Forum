import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { toHeaderUser } from "@/lib/header-user";
import { canCreateEvents, eventGateReason } from "@/lib/event-access";
import { eventBadgeParts, eventTiming, formatEventRange } from "@/lib/events";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import { postExcerpt } from "@/lib/format";
import { resolveAuthor } from "@/lib/anon";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AuthorTag } from "@/components/AuthorTag";
import { ClickableCard } from "@/components/ClickableCard";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

// Upcoming events soonest-first (the useful order for something you might
// attend); past events most-recent-first.
export default async function EventsPage({ params, searchParams }: PageProps<"/[lang]/events">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const tab = sp.when === "past" ? "past" : "upcoming";

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const t = dict.events;
  const now = new Date();

  // "Upcoming" includes anything that hasn't ended yet, so an event running
  // right now stays on the upcoming tab instead of vanishing at its start time.
  //
  // The two tabs spell out complementary conditions rather than one being
  // NOT(the other): an event with no end time compares NULL >= now, which SQL
  // answers "unknown", and NOT(unknown) is still unknown — so a NOT filter
  // silently dropped every open-ended past event instead of listing it.
  const upcomingWhere = {
    OR: [{ eventEndsAt: { gte: now } }, { eventEndsAt: null, eventStartsAt: { gte: now } }],
  };
  const pastWhere = {
    OR: [{ eventEndsAt: { lt: now } }, { eventEndsAt: null, eventStartsAt: { lt: now } }],
  };
  const base = {
    kind: "EVENT" as const,
    hidden: false,
    ...(user ? {} : { category: { locked: false } }),
  };

  const [categories, rows, upcomingCount, canPost, gate] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.post.findMany({
      where: { ...base, ...(tab === "upcoming" ? upcomingWhere : pastWhere) },
      orderBy: tab === "upcoming" ? { eventStartsAt: "asc" } : { eventStartsAt: "desc" },
      take: 60,
      include: {
        author: { select: { forumName: true } },
        authorBusiness: { select: { name: true, slug: true, logoUrl: true } },
        category: true,
        _count: { select: { replies: true } },
        rsvps: { where: { status: "GOING" }, select: { userId: true } },
      },
    }),
    db.post.count({ where: { ...base, ...upcomingWhere } }),
    canCreateEvents(user),
    eventGateReason(user),
  ]);

  const gateNote: Record<string, string> = {
    all: "",
    verified: t.gateVerified,
    label: t.gateLabel,
    perk: t.gatePerk,
    staff: t.gateStaff,
  };

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={categories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">🗓 {t.title}</h1>
            <p className="account-sub">{t.sub}</p>
          </div>

          <div className="events-bar">
            <div className="admin-tabs" style={{ marginBottom: 0, border: "none" }}>
              <Link href={`/${lang}/events`} className={`admin-tab${tab === "upcoming" ? " active" : ""}`}>
                {t.upcoming} {upcomingCount > 0 && <span className="muted-sm">({upcomingCount})</span>}
              </Link>
              <Link href={`/${lang}/events?when=past`} className={`admin-tab${tab === "past" ? " active" : ""}`}>
                {t.past}
              </Link>
            </div>
            {canPost ? (
              <Link href={`/${lang}/events/new`} className="btn btn-primary btn-sm">＋ {t.create}</Link>
            ) : user ? (
              <span className="muted-sm events-gate">🔒 {gateNote[gate ?? "verified"] || t.gateVerified}</span>
            ) : (
              <Link href={`/${lang}/login?next=/${lang}/events`} className="btn btn-ghost btn-sm">{t.loginToCreate}</Link>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {tab === "upcoming" ? t.emptyUpcoming : t.emptyPast}
            </div>
          ) : (
            rows.map((e) => (
              <EventCard
                key={e.id}
                locale={lang}
                dict={dict}
                event={{
                  slug: e.slug,
                  title: e.title,
                  body: e.body,
                  startsAt: e.eventStartsAt!,
                  endsAt: e.eventEndsAt,
                  location: e.eventLocation,
                  authorId: e.authorId,
                  authorName: e.author.forumName,
                  authorBusiness: e.authorBusiness,
                  category: e.category,
                  replies: e._count.replies,
                  going: e.rsvps.length,
                }}
              />
            ))
          )}
        </main>
      </div>
    </>
  );
}

type CardEvent = {
  slug: string;
  title: string;
  body: unknown;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  authorId: string;
  authorName: string;
  authorBusiness: { name: string; slug: string; logoUrl: string | null } | null;
  category: { nameEn: string; nameKa: string; slug: string };
  replies: number;
  going: number;
};

function EventCard({ locale, dict, event }: { locale: Locale; dict: Dictionary; event: CardEvent }) {
  const t = dict.events;
  const style = categoryStyle(event.category.slug);
  const badge = eventBadgeParts(event.startsAt, locale);
  const timing = eventTiming(event.startsAt, event.endsAt);
  const excerpt = postExcerpt(event.body).slice(0, 180);
  const author = resolveAuthor(locale, {
    authorId: event.authorId,
    forumName: event.authorName,
    anonAlias: null,
    authorBusiness: event.authorBusiness,
  });

  return (
    <ClickableCard href={`/${locale}/p/${event.slug}`} className={`event-card event-card-${timing}`}>
      {/* Decorative: the title next to it is the link, so this stays out of
          the tab order rather than being a second route to the same page. */}
      <div className={`event-date-badge event-date-${timing}`} aria-hidden="true">
        <span className="event-date-month">{badge.month}</span>
        <span className="event-date-day">{badge.day}</span>
      </div>
      <div className="event-card-body">
        <div className="post-meta">
          <Link href={`/${locale}/c/${event.category.slug}`} className="chip chip-blue">
            <span className="dot" style={{ background: style.color }} />
            {categoryName(event.category, locale)}
          </Link>
          <span className="sep">·</span>
          by <AuthorTag author={author} />
          {timing === "live" && <span className="event-badge-live">{t.happeningNow}</span>}
        </div>
        <h2 className="post-title">
          <Link href={`/${locale}/p/${event.slug}`}>{event.title}</Link>
        </h2>
        <div className="event-card-when">
          🗓 {formatEventRange(event.startsAt, event.endsAt, locale)}
          {event.location && <> · 📍 {event.location}</>}
        </div>
        {excerpt && <p className="post-excerpt">{excerpt}</p>}
        <div className="event-card-foot muted-sm">
          ✓ {t.goingCount.replace("{n}", String(event.going))}
          <span className="sep">·</span>
          💬 {event.replies} {dict.home.comments}
        </div>
      </div>
    </ClickableCard>
  );
}
