import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";

export const dynamic = "force-dynamic";

export default async function DonatePage({ params }: PageProps<"/[lang]/donate">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = toHeaderUser(user);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.donate;

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="card card-pad donate-hero">
            <div className="donate-badge">💛</div>
            <h1 className="donate-title">{t.title}</h1>
            <p className="donate-sub">{t.subtitle}</p>

            <ul className="donate-perks">
              <li>✦ {t.perkAskAi}</li>
              <li>💛 {t.perkSupport}</li>
              <li>🏷 {t.perkBadge}</li>
            </ul>

            {user?.isDonor ? (
              <p className="donate-already">✓ {t.alreadyDonor}</p>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-full" disabled>
                  {t.ctaComingSoon}
                </button>
                <p className="donate-note">
                  {!user ? (
                    <>
                      {t.loginPrompt}{" "}
                      <Link href={`/${lang}/login?next=/${lang}/donate`}>{dict.common.login}</Link>
                    </>
                  ) : (
                    t.contactPrompt
                  )}
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
