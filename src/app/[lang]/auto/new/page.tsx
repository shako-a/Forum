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
import { AutoListingForm } from "@/components/auto/AutoListingForm";

export const dynamic = "force-dynamic";

export default async function NewAutoListingPage({ params }: PageProps<"/[lang]/auto/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const [dict, allCategories] = await Promise.all([getDictionary(lang), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  const t = dict.auto;
  const allowed = await canPostIn("auto", user);
  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/auto`} className="btn btn-ghost btn-sm biz-back">‹ {t.directory}</Link>
          <div className="account-head">
            <h1 className="account-title">{t.newTitle}</h1>
            <p className="account-sub">{t.newSub}</p>
          </div>
          {allowed ? (
            <AutoListingForm locale={lang} dict={dict} mode="create" />
          ) : (
            <div className="card card-pad biz-gate">
              <p className="biz-gate-title">🚗 {dict.market.notInPlan}</p>
              <p className="biz-gate-sub">{t.notInPlanSub}</p>
              <Link href={`/${lang}/donate`} className="btn btn-primary">{dict.business.upgradeCta}</Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
