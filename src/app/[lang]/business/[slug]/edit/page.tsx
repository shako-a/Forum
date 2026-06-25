import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { deleteBusiness, deleteJob } from "@/app/actions/business";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { BusinessForm } from "@/components/business/BusinessForm";
import { JobForm } from "@/components/business/JobForm";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({ params }: PageProps<"/[lang]/business/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);

  const [allCategories, biz] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.business.findUnique({ where: { slug }, include: { jobs: { orderBy: { createdAt: "desc" } } } }),
  ]);
  if (!biz) notFound();
  if (biz.ownerId !== user.id && user.role !== "ADMIN") redirect(`/${lang}/business/${slug}`);
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">{t.editTitle}</h1>
            <p className="account-sub">{biz.name}</p>
          </div>

          <BusinessForm
            locale={lang}
            dict={dict}
            mode="edit"
            values={{
              id: biz.id,
              name: biz.name,
              category: biz.category,
              tagline: biz.tagline ?? "",
              description: biz.description ?? "",
              city: biz.city ?? "",
              state: biz.state,
              website: biz.website ?? "",
              email: biz.email ?? "",
              phone: biz.phone ?? "",
              logoUrl: biz.logoUrl ?? "",
            }}
          />

          {/* Jobs management */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">💼 {t.jobs}</h2>
            {biz.jobs.length > 0 && (
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
            <JobForm locale={lang} dict={dict} businessId={biz.id} />
          </div>

          {/* Danger zone */}
          <div className="card card-pad biz-danger">
            <ConfirmButton
              action={deleteBusiness.bind(null, biz.id, lang)}
              label={t.deleteBusiness}
              confirmText={t.confirmDeleteBusiness}
              className="btn btn-danger"
            />
          </div>
        </main>
      </div>
    </>
  );
}
