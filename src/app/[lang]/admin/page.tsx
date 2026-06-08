import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";

async function safeCount(fn: () => Promise<number>) {
  try {
    return await fn();
  } catch {
    return null; // DB not ready
  }
}

export default async function AdminDashboard({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin;

  const [users, categories, posts, hidden, ads] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.category.count()),
    safeCount(() => db.post.count()),
    safeCount(() => db.post.count({ where: { hidden: true } })),
    safeCount(() => db.adCard.count()),
  ]);

  const stats = [
    { label: t.users, value: users },
    { label: t.categories, value: categories },
    { label: "Posts", value: posts },
    { label: t.hiddenContent, value: hidden },
    { label: t.adCards, value: ads },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t.dashboard}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-black/10 dark:border-white/10 p-4"
          >
            <div className="text-2xl font-bold">{s.value ?? "—"}</div>
            <div className="text-sm opacity-60">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
