import { notFound, redirect } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { hasAiTranslate } from "@/lib/perks";
import { defaultTarget } from "@/lib/translate";
import { localeHref } from "@/lib/locale-url";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Translator } from "@/components/Translator";
import { AiAllowance } from "@/components/AiAllowance";

export const dynamic = "force-dynamic";

// The translator is its own entitlement, so the page enforces that rather than
// general AI access — someone can hold the assistant and not this, or this and
// not the assistant. Gating the nav link isn't enough; this URL is reachable
// directly.
export default async function TranslatePage({ params }: PageProps<"/[lang]/translate">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(localeHref(`/${lang}/login?next=/${lang}/translate`));
  if (!hasAiTranslate(user)) redirect(localeHref(`/${lang}/donate`));

  const dict = await getDictionary(lang);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.translate;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="card card-pad ask-hero">
            <div className="ask-spark">✦</div>
            <h1 className="ask-title">{t.title}</h1>
            <p className="ask-donor-tag">🌐 {t.sub}</p>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            {/* Usage % and refill time only — the allowance is shared with the
                assistant, so it reads the same here as it does on /ask. */}
            <AiAllowance user={user} dict={dict} locale={lang} />
            <Translator dict={dict} defaultTarget={defaultTarget(lang)} />
          </div>
        </main>
      </div>
    </>
  );
}
