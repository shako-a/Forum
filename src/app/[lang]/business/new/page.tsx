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
import { BusinessForm } from "@/components/business/BusinessForm";

export const dynamic = "force-dynamic";

export default async function NewBusinessPage({ params }: PageProps<"/[lang]/business/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const dict = await getDictionary(lang);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.business;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">{t.registerTitle}</h1>
            <p className="account-sub">{t.registerSub}</p>
          </div>
          {(await canPostIn("business", user)) ? (
            <BusinessForm locale={lang} dict={dict} mode="create" />
          ) : (
            <div className="card card-pad biz-gate">
              <p className="biz-gate-title">💼 {t.proRequired}</p>
              <p className="biz-gate-sub">{t.proRequiredSub}</p>
              <Link href={`/${lang}/donate`} className="btn btn-primary">{t.upgradeCta}</Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
