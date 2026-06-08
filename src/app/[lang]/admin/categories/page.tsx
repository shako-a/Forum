import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { categoryName } from "@/i18n/localize";
import { db } from "@/lib/db";

export default async function AdminCategoriesPage({ params }: PageProps<"/[lang]/admin/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const categories = await db.category
    .findMany({ orderBy: { sortOrder: "asc" } })
    .catch(() => []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{dict.admin.categories}</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-left opacity-60">
            <th className="py-2">{dict.post.title}</th>
            <th className="py-2">Slug</th>
            <th className="py-2">{dict.categories.locked}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2">{categoryName(c, lang)}</td>
              <td className="py-2 opacity-60">{c.slug}</td>
              <td className="py-2">{c.locked ? "🔒" : "—"}</td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center opacity-50">
                {dict.home.feedEmpty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
