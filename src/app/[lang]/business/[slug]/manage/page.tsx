import { notFound, redirect } from "next/navigation";
import Link from "@/components/Link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getBusinessForManage } from "@/lib/business-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ManagersAdmin } from "@/components/business/ManagersAdmin";

export const dynamic = "force-dynamic";

export default async function ManageBusinessPage({ params }: PageProps<"/[lang]/business/[slug]/manage">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);

  const [allCategories, biz] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getBusinessForManage(slug),
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
            ‹ {biz.name}
          </Link>
          <div className="account-head">
            <h1 className="account-title">⚙️ {t.manageTitle}</h1>
            <p className="account-sub">{biz.name}</p>
          </div>

          {/* Quick links */}
          <div className="card card-pad biz-section biz-manage-links">
            <Link href={`/${lang}/business/${biz.slug}/edit`} className="btn btn-ghost">
              ✏️ {t.editProfile}
            </Link>
            <Link href={`/${lang}/business/${biz.slug}/jobs`} className="btn btn-ghost">
              💼 {t.manageJobs}
            </Link>
          </div>

          {/* Managers (owner only) */}
          {isOwner && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">👥 {t.managers}</h2>
              <p className="account-sub" style={{ marginTop: 0 }}>{t.managersSub}</p>
              <ManagersAdmin
                locale={lang}
                businessId={biz.id}
                ownerName={biz.owner.forumName}
                managers={biz.managers.map((m) => ({ userId: m.user.id, forumName: m.user.forumName }))}
                dict={dict}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
