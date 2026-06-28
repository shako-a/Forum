import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { CategoryAdmin, type AdminCategory, type MemberOption } from "@/components/admin/CategoryAdmin";

export default async function AdminCategoriesPage({ params }: PageProps<"/[lang]/admin/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // admins only — not moderators
  const dict = await getDictionary(lang);

  const [rows, members] = await Promise.all([
    db.category
      .findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { posts: true } },
          moderators: { select: { id: true, forumName: true }, orderBy: { forumName: "asc" } },
        },
      })
      .catch(() => []),
    // Candidates for category-moderator assignment: only existing moderators and
    // admins (a plain user must be promoted to Moderator first, on the Users page).
    db.user
      .findMany({
        where: { status: "ACTIVE", role: { in: ["MODERATOR", "ADMIN"] } },
        select: { id: true, forumName: true },
        orderBy: { forumName: "asc" },
        take: 200,
      })
      .catch(() => []),
  ]);

  const categories: AdminCategory[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameEn: c.nameEn,
    nameKa: c.nameKa,
    descriptionEn: c.descriptionEn,
    descriptionKa: c.descriptionKa,
    locked: c.locked,
    sortOrder: c.sortOrder,
    postCount: c._count.posts,
    moderators: c.moderators,
  }));

  return <CategoryAdmin dict={dict} categories={categories} members={members as MemberOption[]} />;
}
