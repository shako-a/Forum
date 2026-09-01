import Link from "@/components/Link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { JobPostForm } from "@/components/jobs/JobPostForm";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: PageProps<"/[lang]/jobs/[id]/edit">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories, job] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.jobPosting.findUnique({ where: { id } }),
  ]);
  if (!job || !job.posterId) notFound();
  if (job.posterId !== user.id && user.role !== "ADMIN") redirect(`/${lang}/jobs`);
  const t = dict.business;
  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/jobs/mine`} className="btn btn-ghost btn-sm biz-back">‹ {t.myJobs}</Link>
          <div className="account-head"><h1 className="account-title">{t.editJob}</h1></div>
          <JobPostForm
            locale={lang}
            dict={dict}
            mode="edit"
            values={{
              id: job.id,
              title: job.title,
              description: job.description,
              companyName: job.companyName ?? "",
              jobType: job.jobType ?? "",
              pay: job.pay ?? "",
              city: job.city ?? "",
              state: job.state ?? "",
              contactEmail: job.contactEmail ?? "",
              contactPhone: job.contactPhone ?? "",
              active: job.active,
            }}
          />
        </main>
      </div>
    </>
  );
}
