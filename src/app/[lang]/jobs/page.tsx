import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getJobsBoard } from "@/lib/business-data";
import { businessCategoryIcon } from "@/lib/business-categories";
import { timeAgo } from "@/lib/format";
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

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">💼 {t.jobsBoard}</h1>
            <p className="account-sub">{t.jobsBoardSub}</p>
          </div>

          {jobs.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {t.noJobs}
            </div>
          ) : (
            jobs.map((j) => (
              <article key={j.id} className="card card-pad biz-job-board-item">
                <div className="biz-job-board-head">
                  <span className="biz-job-board-logo" aria-hidden="true">{businessCategoryIcon(j.business.category)}</span>
                  <div>
                    <h3 className="biz-job-title">{j.title}</h3>
                    <Link href={`/${lang}/business/${j.business.slug}`} className="biz-job-company">
                      {j.business.name}{j.business.verified && <span className="biz-verified">✓</span>}
                    </Link>
                  </div>
                  <span className="biz-job-board-time">{timeAgo(new Date(j.createdAt), lang)}</span>
                </div>
                <p className="biz-job-desc">{j.description}</p>
                {(j.city || j.state) && (
                  <p className="biz-job-loc">📍 {[j.city, j.state].filter(Boolean).join(", ")}</p>
                )}
              </article>
            ))
          )}
        </main>
      </div>
    </>
  );
}
