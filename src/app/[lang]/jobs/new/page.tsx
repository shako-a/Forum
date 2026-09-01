import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { canPostIn } from "@/lib/posting-access";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { JobPostForm } from "@/components/jobs/JobPostForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage({ params }: PageProps<"/[lang]/jobs/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, allowed] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    canPostIn("jobs", user),
  ]);
  const t = dict.business;
  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/jobs`} className="btn btn-ghost btn-sm biz-back">‹ {t.jobsBoard}</Link>
          <div className="account-head">
            <h1 className="account-title">{t.postJobTitle}</h1>
            <p className="account-sub">{t.postJobSub}</p>
          </div>
          {allowed ? (
            <JobPostForm locale={lang} dict={dict} mode="create" prefillEmail={user.email} />
          ) : (
            <div className="card card-pad biz-gate">
              <p className="biz-gate-title">💼 {dict.market.notInPlan}</p>
              <p className="biz-gate-sub">{t.jobsNotInPlanSub}</p>
              <Link href={`/${lang}/donate`} className="btn btn-primary">{t.upgradeCta}</Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
