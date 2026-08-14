import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { UserAdmin, type AdminUser } from "@/components/admin/UserAdmin";

export default async function AdminUsersPage({ params }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // user management is admin-only (prevents self-promotion)
  const dict = await getDictionary(lang);

  const [me, users] = await Promise.all([
    getCurrentUser(),
    db.user
      .findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, forumName: true, email: true, role: true, status: true, isDonor: true, isPro: true, isSupporter: true, canAccessAdmin: true },
        take: 200,
      })
      .catch(() => []),
  ]);

  return (
    <UserAdmin dict={dict} users={users as AdminUser[]} currentUserId={me?.id ?? ""} locale={lang} />
  );
}
