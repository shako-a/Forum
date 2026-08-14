import Link from "next/link";
import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TierCard } from "@/components/TierCard";
import { getPublicPackage } from "@/lib/packages";
import { holdsPackage } from "@/lib/tiers";

export const dynamic = "force-dynamic";

// A single paid package. Dynamic by slug so packages an admin creates get a
// page automatically, with no route to add.
export default async function PackagePage({ params }: PageProps<"/[lang]/more/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const pkg = await getPublicPackage(lang, slug);
  if (!pkg) notFound(); // unknown or deactivated

  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = toHeaderUser(user);
  const allCategories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const t = dict.tiers;

  const heldKeys = user
    ? (
        await db.userPackage.findMany({
          where: { userId: user.id },
          select: { package: { select: { key: true } } },
        })
      ).map((r) => r.package.key)
    : [];
  const held = holdsPackage(user ? { ...user, heldKeys } : null, pkg);

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/more`} className="tier-back">
            ← {t.backToAll}
          </Link>

          {/* showCta={false}: the card is the summary here, and the real
              call-to-action lives below with the login/contact handling. */}
          <TierCard pkg={pkg} locale={lang} dict={dict} held={held} showCta={false} />

          <div className="card card-pad tier-detail">
            <p className="tier-pitch">{pkg.pitch}</p>

            {held ? (
              <p className="tier-held">✓ {t.thanksHolding}</p>
            ) : (
              <>
                {/* Payments are not wired up yet — packages are granted by an
                    admin for now. */}
                <button type="button" className="btn btn-primary btn-full" disabled>
                  {t.ctaComingSoon}
                </button>
                <p className="tier-note">
                  {!user ? (
                    <>
                      {t.loginPrompt}{" "}
                      <Link href={`/${lang}/login?next=/${lang}/more/${pkg.slug}`}>
                        {dict.common.login}
                      </Link>
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
