import { notFound, redirect } from "next/navigation";
import Link from "@/components/Link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { deleteBusiness } from "@/app/actions/business";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { BusinessForm } from "@/components/business/BusinessForm";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({ params }: PageProps<"/[lang]/business/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);

  const [allCategories, biz] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.business.findUnique({ where: { slug } }),
  ]);
  if (!biz) notFound();
  if (!(await canManageBusiness(user.id, biz.id, user.role === "ADMIN"))) redirect(`/${lang}/business/${slug}`);
  const isOwner = biz.ownerId === user.id;
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/business/${biz.slug}`} className="btn btn-ghost btn-sm biz-back">
            ‹ {t.back}
          </Link>
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
              photos: biz.photos,
            }}
          />

          {/* Danger zone — owner only */}
          {isOwner && (
            <div className="card card-pad biz-danger">
              <ConfirmButton
                action={deleteBusiness.bind(null, biz.id, lang)}
                label={t.deleteBusiness}
                confirmText={t.confirmDeleteBusiness}
                className="btn btn-danger"
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
