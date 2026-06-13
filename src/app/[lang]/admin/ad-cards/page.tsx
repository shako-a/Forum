import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";
import { AdCardAdmin, type AdminAdCard } from "@/components/admin/AdCardAdmin";

export default async function AdminAdCardsPage({ params }: PageProps<"/[lang]/admin/ad-cards">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const cards = (await db.adCard
    .findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] })
    .catch(() => [])) as AdminAdCard[];

  return <AdCardAdmin dict={dict} cards={cards} />;
}
