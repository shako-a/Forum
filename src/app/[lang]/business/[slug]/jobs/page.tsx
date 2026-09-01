import { notFound, redirect } from "next/navigation";
import Link from "@/components/Link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { deleteJob } from "@/app/actions/business";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { JobForm } from "@/components/business/JobForm";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function ManageJobsPage({ params }: PageProps<"/[lang]/business/[slug]/jobs">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);

  const [allCategories, biz] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.business.findUnique({ where: { slug }, include: { jobs: { orderBy: { createdAt: "desc" } } } }),
  ]);
  if (!biz) notFound();
  if (!(await canManageBusiness(user.id, biz.id, user.role === "ADMIN"))) redirect(`/${lang}/business/${slug}`);
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/business/${biz.slug}/manage`} className="btn btn-ghost btn-sm biz-back">
            ‹ {t.manageTitle}
          </Link>
          <div className="account-head">
            <h1 className="account-title">💼 {t.manageJobs}</h1>
            <p className="account-sub">{t.jobsManageSub}</p>
          </div>

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">{t.newJob}</h2>
            <JobForm locale={lang} dict={dict} businessId={biz.id} />
          </div>

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">{t.jobs}</h2>
            {biz.jobs.length === 0 ? (
              <p className="biz-empty">{t.noJobsYet}</p>
            ) : (
              <ul className="biz-job-manage-list">
                {biz.jobs.map((j) => (
                  <li key={j.id} className="biz-job-manage">
                    <div>
                      <strong>{j.title}</strong>
                      {(j.city || j.state) && (
                        <span className="muted-sm"> · {[j.city, j.state].filter(Boolean).join(", ")}</span>
                      )}
                    </div>
                    <ConfirmButton
                      action={deleteJob.bind(null, j.id, lang)}
                      label={dict.admin.delete}
                      confirmText={t.confirmDeleteJob}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
