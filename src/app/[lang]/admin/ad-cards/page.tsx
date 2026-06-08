import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { adTitle } from "@/i18n/localize";
import { db } from "@/lib/db";

export default async function AdminAdCardsPage({ params }: PageProps<"/[lang]/admin/ad-cards">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const ads = await db.adCard.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{dict.admin.adCards}</h1>
      <ul className="flex flex-col gap-2 text-sm">
        {ads.map((ad) => (
          <li
            key={ad.id}
            className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-3 py-2"
          >
            <span>{adTitle(ad, lang)}</span>
            <span className="opacity-60">
              {ad.placement} · {ad.active ? "✓" : "—"}
            </span>
          </li>
        ))}
        {ads.length === 0 && <li className="opacity-50">{dict.home.feedEmpty}</li>}
      </ul>
    </div>
  );
}
