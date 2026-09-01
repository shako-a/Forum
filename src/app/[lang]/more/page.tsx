import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TierCard } from "@/components/TierCard";
import { getPublicPackages } from "@/lib/packages";
import { holdsPackage } from "@/lib/tiers";

export const dynamic = "force-dynamic";

// "მეტი" — the hub for everything paid. Lists each active package side by side
// so the differences are readable at a glance, then links to each package's own
// page. Packages, prices, discounts and perks are all admin-managed.
export default async function MorePage({ params }: PageProps<"/[lang]/more">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user, packages] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    getPublicPackages(lang),
  ]);
  const headerUser = toHeaderUser(user);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const heldKeys = user ? await heldPackageKeys(user.id) : [];
  const t = dict.tiers;

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <header className="more-hero">
            <h1 className="more-title">{t.pageTitle}</h1>
            <p className="more-sub">{t.pageSubtitle}</p>
          </header>

          {packages.length === 0 ? (
            <p className="more-note">{t.noneYet}</p>
          ) : (
            <div className="tier-cards">
              {packages.map((pkg) => (
                <TierCard
                  key={pkg.id}
                  pkg={pkg}
                  locale={lang}
                  dict={dict}
                  held={holdsPackage(user ? { ...user, heldKeys } : null, pkg)}
                />
              ))}
            </div>
          )}

          <p className="more-note">
            {t.allPaymentsNote}
            {!user && (
              <>
                {" "}
                <Link href={`/${lang}/login?next=/${lang}/more`}>{dict.common.login}</Link>
              </>
            )}
          </p>
        </main>
      </div>
    </>
  );
}

// Keys of admin-created packages the user was granted (the three built-ins are
// carried by the User booleans instead).
async function heldPackageKeys(userId: string): Promise<string[]> {
  const rows = await db.userPackage.findMany({
    where: { userId },
    select: { package: { select: { key: true } } },
  });
  return rows.map((r) => r.package.key);
}
