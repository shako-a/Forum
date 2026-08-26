import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { canCreateEvents } from "@/lib/event-access";
import { getActingBusiness } from "@/lib/acting-as";
import { categoryName } from "@/i18n/localize";
import { toHeaderUser } from "@/lib/header-user";
import { Header } from "@/components/Header";
import { EventForm } from "@/components/events/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage({ params, searchParams }: PageProps<"/[lang]/events/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/events/new`);
  // The gate is re-checked inside createEvent too — this just keeps someone
  // who can't post from filling in a form that would be refused.
  if (!(await canCreateEvents(user))) redirect(`/${lang}/events`);

  const dict = await getDictionary(lang);
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const categories = cats.map((c) => ({ id: c.id, name: categoryName(c, lang) }));

  const sp = await searchParams;
  const slug = typeof sp.category === "string" ? sp.category : undefined;
  const defaultCategoryId = slug ? cats.find((c) => c.slug === slug)?.id : undefined;
  const acting = await getActingBusiness();

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <main className="create-wrap">
        <EventForm
          locale={lang}
          dict={dict}
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          actingAs={acting?.name ?? null}
        />
      </main>
    </>
  );
}
