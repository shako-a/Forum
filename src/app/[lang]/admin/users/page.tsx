import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";

export default async function AdminUsersPage({ params }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const users = await db.user
    .findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, forumName: true, email: true, role: true, status: true },
      take: 100,
    })
    .catch(() => []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{dict.admin.users}</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-left opacity-60">
            <th className="py-2">{dict.auth.forumName}</th>
            <th className="py-2">{dict.auth.email}</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2">{u.forumName}</td>
              <td className="py-2 opacity-60">{u.email}</td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.status}</td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center opacity-50">
                {dict.home.feedEmpty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
