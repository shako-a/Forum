import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getPostView } from "@/lib/forum-data";
import { ensureJobDiscussion } from "@/lib/job-discussion";
import { businessCategoryIcon } from "@/lib/business-categories";
import { jobTypeLabel } from "@/lib/jobs";
import { timeAgo } from "@/lib/format";
import { aliasOptions } from "@/lib/anon";
import { getActingBusiness } from "@/lib/acting-as";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ReplyComposer } from "@/components/ReplyComposer";
import { ReplyThread } from "@/components/ReplyThread";
import { ReplySort, type ReplySortKey } from "@/components/ReplySort";
import { ShareMenu } from "@/components/ShareMenu";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params, searchParams }: PageProps<"/[lang]/jobs/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const sort: ReplySortKey = sp.sort === "new" || sp.sort === "old" ? sp.sort : "best";

  const [dict, user, allCategories, job] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.jobPosting.findUnique({
      where: { id },
      include: {
        business: { select: { slug: true, name: true, logoUrl: true, verified: true, category: true } },
        poster: { select: { id: true, forumName: true } },
      },
    }),
  ]);
  if (!job) notFound();

  const t = dict.business;
  const isOwner = !!user && (job.posterId === user.id || user.role === "ADMIN");
  // A closed listing stays readable for whoever posted it (and staff), so they
  // can reopen it — everyone else is sent back to the board.
  if (!job.active && !isOwner) redirect(`/${lang}/jobs`);

  // The Q&A thread, created on first view. Everything below reuses the forum's
  // own reply machinery through it.
  const discussion = await ensureJobDiscussion(job.id);
  const viewer = user
    ? { id: user.id, role: user.role, isOwner: user.isOwner, canRevealAnon: user.canRevealAnon }
    : null;
  const thread = discussion ? await getPostView(discussion.slug, viewer, sort, lang) : null;

  const acting = user ? await getActingBusiness() : null;
  const loginHref = `/${lang}/login?next=/${lang}/jobs/${job.id}`;
  const location = [job.city, job.state].filter(Boolean).join(", ");
  const canModerate = thread?.canModerate ?? false;
  const canReply = !!user && (!thread?.post.repliesLocked || canModerate);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/jobs`} className="admin-link job-back">← {t.jobsBoard}</Link>

          <article className="card card-pad job-detail">
            {!job.active && <p className="job-closed-note">🔒 {t.jobClosed}</p>}

            <div className="biz-job-board-head">
              <span className="biz-job-board-logo" aria-hidden="true">
                {job.business ? businessCategoryIcon(job.business.category) : "👤"}
              </span>
              <div>
                <h1 className="job-detail-title">{job.title}</h1>
                {job.business ? (
                  <Link href={`/${lang}/business/${job.business.slug}`} className="biz-job-company">
                    {job.business.name}
                    {job.business.verified && <span className="biz-verified">✓</span>}
                  </Link>
                ) : (
                  <span className="biz-job-company">
                    {job.companyName && <>{job.companyName} · </>}
                    {job.poster && (
                      <Link href={`/${lang}/u/${encodeURIComponent(job.poster.forumName)}`}>
                        {t.jobPostedBy} {job.poster.forumName}
                      </Link>
                    )}
                  </span>
                )}
              </div>
              <span className="biz-job-board-time">{timeAgo(new Date(job.createdAt), lang)}</span>
            </div>

            {(job.jobType || job.pay || location) && (
              <div className="mk-detail-tags job-detail-tags">
                {job.jobType && <span className="mk-tag">{jobTypeLabel(job.jobType, lang)}</span>}
                {job.pay && <span className="mk-tag">💵 {job.pay}</span>}
                {location && <span className="mk-tag">📍 {location}</span>}
              </div>
            )}

            <h2 className="job-section-title">{t.jobAbout}</h2>
            {/* Descriptions are plain text typed into a textarea, so newlines
                are the only formatting to preserve — rendering them as HTML
                would let a poster inject markup. */}
            <p className="job-detail-desc">{job.description}</p>

            {(job.contactEmail || job.contactPhone) && (
              <>
                <h2 className="job-section-title">{t.jobHowToApply}</h2>
                <div className="job-contacts">
                  {job.contactEmail && (
                    <a href={`mailto:${job.contactEmail}`} className="btn btn-primary btn-sm">
                      ✉ {t.jobApplyByEmail}
                    </a>
                  )}
                  {job.contactPhone && (
                    <a href={`tel:${job.contactPhone}`} className="btn btn-ghost btn-sm">
                      📞 {job.contactPhone}
                    </a>
                  )}
                </div>
              </>
            )}

            <div className="post-actions job-detail-actions">
              <ShareMenu title={job.title} dict={dict} />
              {isOwner && job.posterId && (
                <Link href={`/${lang}/jobs/${job.id}/edit`} className="action">
                  ✎ {dict.admin.edit}
                </Link>
              )}
            </div>
          </article>

          {/* Questions & answers — the forum's reply system, on this listing. */}
          <section id="questions" className="job-qa">
            <div className="job-qa-head">
              <h2 className="job-section-title" style={{ margin: 0 }}>
                💬 {t.jobQuestions} · {thread?.replyCount ?? 0}
              </h2>
              {(thread?.replyCount ?? 0) > 1 && <ReplySort current={sort} dict={dict} />}
            </div>
            <p className="account-sub" style={{ marginTop: 0 }}>{t.jobQuestionsSub}</p>

            {!thread ? (
              <p className="muted-sm">{t.jobQuestionsUnavailable}</p>
            ) : (
              <>
                {!user ? (
                  <div className="card card-pad" style={{ marginBottom: 16 }}>
                    <Link href={loginHref}>{t.jobAskLogin}</Link>
                  </div>
                ) : thread.post.repliesLocked && !canModerate ? (
                  <p className="muted-sm" style={{ marginBottom: 16 }}>🔒 {dict.post.repliesLocked}</p>
                ) : (
                  <div style={{ marginBottom: 18 }}>
                    <ReplyComposer
                      locale={lang}
                      slug={thread.post.slug}
                      postId={thread.post.id}
                      dict={dict}
                      realName={user.forumName}
                      aliases={aliasOptions(user.id)}
                      actingAs={acting?.name ?? null}
                    />
                  </div>
                )}

                <ReplyThread
                  roots={thread.roots}
                  locale={lang}
                  slug={thread.post.slug}
                  postId={thread.post.id}
                  dict={dict}
                  canVote={!!user}
                  canReply={canReply}
                  canModerate={canModerate}
                  isLoggedIn={!!user}
                  loginHref={loginHref}
                  shareTitle={job.title}
                  realName={user?.forumName ?? ""}
                  aliases={user ? aliasOptions(user.id) : []}
                  actingAs={acting?.name ?? null}
                />
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
