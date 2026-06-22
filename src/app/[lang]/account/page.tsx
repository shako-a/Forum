import { notFound } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { AccountForm } from "@/components/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const user = await requireUser(lang); // redirects guests to login

  // requireUser returns the trimmed DAL selection; load the contact fields the
  // form needs to pre-fill (phone/email aren't in the DAL projection).
  const [allCategories, full] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        forumName: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        state: true,
        hideRealName: true,
      },
    }),
  ]);
  if (!full) notFound();

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <div className="account-head">
            <h1 className="account-title">{dict.profile.accountTitle}</h1>
            <p className="account-sub">{dict.profile.accountSub}</p>
          </div>
          <AccountForm
            locale={lang}
            dict={dict}
            values={{
              email: full.email,
              forumName: full.forumName,
              firstName: full.firstName,
              lastName: full.lastName,
              phone: full.phone,
              city: full.city ?? "",
              state: full.state,
              hideRealName: full.hideRealName,
            }}
          />
        </main>
      </div>
    </>
  );
}
