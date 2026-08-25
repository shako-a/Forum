import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMyJobs } from "@/lib/business-data";
import { canPostIn } from "@/lib/posting-access";
import { jobTypeLabel } from "@/lib/jobs";
import { timeAgo } from "@/lib/format";
import { setUserJobActive, deleteUserJob } from "@/app/actions/jobs";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function MyJobsPage({ params }: PageProps<"/[lang]/jobs/mine">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, jobs, canPost] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMyJobs(user.id),
    canPostIn("jobs", user),
  ]);
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="biz-dir-head">
            <div>
              <h1 className="account-title">{t.myJobs}</h1>
              <p className="account-sub">{t.myJobsSub}</p>
            </div>
            {canPost && <Link href={`/${lang}/jobs/new`} className="btn btn-primary">＋ {t.postJob}</Link>}
          </div>
          {jobs.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>{t.noMyJobs}</div>
          ) : (
            <ul className="biz-job-manage-list">
              {jobs.map((j) => (
                <li key={j.id} className={`biz-job-manage${j.active ? "" : " is-off"}`}>
                  <div>
                    <strong>{j.title}</strong>
                    {j.companyName && <span className="muted-sm"> · {j.companyName}</span>}
                    <div className="muted-sm">
                      {[jobTypeLabel(j.jobType, lang), j.pay, [j.city, j.state].filter(Boolean).join(", "), timeAgo(j.createdAt, lang)].filter(Boolean).join(" · ")}
                      {!j.active && <> · <strong>{dict.market.paused}</strong></>}
                    </div>
                  </div>
                  <div className="mk-owner mk-owner-compact">
                    <form action={setUserJobActive.bind(null, j.id, !j.active, lang)}>
                      <button type="submit" className="btn btn-ghost btn-sm">{j.active ? `⏸ ${dict.market.pause}` : `↻ ${dict.market.resume}`}</button>
                    </form>
                    <Link href={`/${lang}/jobs/${j.id}/edit`} className="btn btn-ghost btn-sm">✏️ {dict.admin.edit}</Link>
                    <ConfirmButton action={deleteUserJob.bind(null, j.id, lang)} label={`🗑 ${dict.admin.delete}`} confirmText={t.confirmDeleteJob} className="btn btn-danger btn-sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}
