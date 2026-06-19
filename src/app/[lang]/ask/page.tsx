import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";

export const dynamic = "force-dynamic";

// Ask AI is a Donor-only perk. Gating the header button isn't enough — this
// page is reachable directly, so enforce the tier server-side:
//   guest        → login
//   non-Donor    → the upgrade page
//   Donor        → the feature (a stub for now; the AI itself lands later)
export default async function AskPage({ params }: PageProps<"/[lang]/ask">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/ask`);
  if (!user.isDonor) redirect(`/${lang}/donate`);

  const dict = await getDictionary(lang);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.ask;

  return (
    <>
      <Header locale={lang} dict={dict} user={{ forumName: user.forumName, isDonor: user.isDonor }} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="card card-pad ask-hero">
            <div className="ask-spark">✦</div>
            <h1 className="ask-title">{dict.common.askAi}</h1>
            <p className="ask-donor-tag">💛 {t.donorAccess}</p>
            <p className="ask-soon">{t.comingSoon}</p>
          </div>
        </main>
      </div>
    </>
  );
}
