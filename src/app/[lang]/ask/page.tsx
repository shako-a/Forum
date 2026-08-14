import { notFound, redirect } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { hasAiAccess } from "@/lib/perks";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AskAiChat } from "@/components/AskAiChat";
import { AiAllowance } from "@/components/AiAllowance";

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
  if (!hasAiAccess(user)) redirect(`/${lang}/donate`);

  const dict = await getDictionary(lang);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.ask;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="card card-pad ask-hero">
            <div className="ask-spark">✦</div>
            <h1 className="ask-title">{dict.common.askAi}</h1>
            <p className="ask-donor-tag">💛 {t.donorAccess}</p>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            {/* Usage % and refill time only — no credit counts or costs. */}
            <AiAllowance user={user} dict={dict} locale={lang} />
            <AskAiChat dict={dict} />
          </div>
        </main>
      </div>
    </>
  );
}
