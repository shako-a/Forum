import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { UserAdmin, type AdminUser } from "@/components/admin/UserAdmin";

export default async function AdminUsersPage({ params }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const [me, users] = await Promise.all([
    getCurrentUser(),
    db.user
      .findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, forumName: true, email: true, role: true, status: true },
        take: 200,
      })
      .catch(() => []),
  ]);

  return <UserAdmin dict={dict} users={users as AdminUser[]} currentUserId={me?.id ?? ""} />;
}
