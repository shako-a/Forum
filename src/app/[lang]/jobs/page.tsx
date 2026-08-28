import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getJobsBoard } from "@/lib/business-data";
import { jobQuestionCounts } from "@/lib/job-discussion";
import { businessCategoryIcon } from "@/lib/business-categories";
import { timeAgo } from "@/lib/format";
import { jobTypeLabel } from "@/lib/jobs";
import { canPostIn } from "@/lib/posting-access";
import { ClickableCard } from "@/components/ClickableCard";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";

export const dynamic = "force-dynamic";

export default async function JobsBoardPage({ params }: PageProps<"/[lang]/jobs">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user, allCategories, jobs] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getJobsBoard(),
  ]);
  const t = dict.business;
  const [canPost, questions] = await Promise.all([
    canPostIn("jobs", user),
    jobQuestionCounts(jobs.map((j) => j.id)),
  ]);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">💼 {t.jobsBoard}</h1>
              <p className="account-sub">{t.jobsBoardSub}</p>
            </div>
            <div className="mk-head-actions">
              {user && <Link href={`/${lang}/jobs/mine`} className="btn btn-ghost btn-sm">{t.myJobs}</Link>}
              <Link href={canPost ? `/${lang}/jobs/new` : `/${lang}/login?next=/${lang}/jobs/new`} className="btn btn-primary">＋ {t.postJob}</Link>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noJobs}
            </div>
          ) : (
            jobs.map((j) => (
              <ClickableCard key={j.id} href={`/${lang}/jobs/${j.id}`} className="card card-pad biz-job-board-item">
                <div className="biz-job-board-head">
                  <span className="biz-job-board-logo" aria-hidden="true">{j.business ? businessCategoryIcon(j.business.category) : "👤"}</span>
                  <div>
                    <h3 className="biz-job-title">
                      <Link href={`/${lang}/jobs/${j.id}`}>{j.title}</Link>
                    </h3>
                    {j.business ? (
                      <Link href={`/${lang}/business/${j.business.slug}`} className="biz-job-company">
                        {j.business.name}{j.business.verified && <span className="biz-verified">✓</span>}
                      </Link>
                    ) : (
                      <span className="biz-job-company">
                        {j.companyName && <>{j.companyName} · </>}
                        {j.poster && (
                          <Link href={`/${lang}/u/${encodeURIComponent(j.poster.forumName)}`}>{t.jobPostedBy} {j.poster.forumName}</Link>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="biz-job-board-time">{timeAgo(new Date(j.createdAt), lang)}</span>
                </div>
                {(j.jobType || j.pay) && (
                  <div className="mk-detail-tags" style={{ marginBottom: 8 }}>
                    {j.jobType && <span className="mk-tag">{jobTypeLabel(j.jobType, lang)}</span>}
                    {j.pay && <span className="mk-tag">💵 {j.pay}</span>}
                  </div>
                )}
                <p className="biz-job-desc biz-job-desc-clamp">{j.description}</p>
                {(j.city || j.state) && (
                  <p className="biz-job-loc">📍 {[j.city, j.state].filter(Boolean).join(", ")}</p>
                )}
                {(j.contactEmail || j.contactPhone) && (
                  <p className="biz-job-loc">
                    {j.contactEmail && <a href={`mailto:${j.contactEmail}`}>✉ {j.contactEmail}</a>}
                    {j.contactEmail && j.contactPhone && " · "}
                    {j.contactPhone && <a href={`tel:${j.contactPhone}`}>📞 {j.contactPhone}</a>}
                  </p>
                )}
                <div className="job-card-foot">
                  <Link href={`/${lang}/jobs/${j.id}`} className="action">
                    📄 {t.jobViewDetails}
                  </Link>
                  <Link href={`/${lang}/jobs/${j.id}#questions`} className="action">
                    💬 {t.jobQuestionsCount.replace("{n}", String(questions.get(j.id) ?? 0))}
                  </Link>
                </div>
              </ClickableCard>
            ))
          )}
        </main>
      </div>
    </>
  );
}
