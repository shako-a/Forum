import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { AdminUserEdit } from "@/components/admin/AdminUserEdit";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: PageProps<"/[lang]/admin/users/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // user management is admin-only
  const dict = await getDictionary(lang);

  const [user, allLabels] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        forumName: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        state: true,
        hideRealName: true,
        role: true,
        status: true,
        isDonor: true,
        canAccessAdmin: true,
        createdAt: true,
        labels: { select: { id: true } },
        _count: { select: { posts: true, replies: true } },
      },
    }),
    db.label.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user) notFound();

  return (
    <AdminUserEdit
      locale={lang}
      dict={dict}
      user={{
        id: user.id,
        forumName: user.forumName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        state: user.state,
        hideRealName: user.hideRealName,
        role: user.role,
        status: user.status,
        isDonor: user.isDonor,
        canAccessAdmin: user.canAccessAdmin,
        createdAt: user.createdAt.toISOString(),
        postCount: user._count.posts,
        replyCount: user._count.replies,
      }}
      labels={allLabels.map((l) => ({
        id: l.id,
        nameEn: l.nameEn,
        nameKa: l.nameKa,
        color: l.color,
        background: l.background,
        font: l.font,
        bold: l.bold,
      }))}
      assignedLabelIds={user.labels.map((l) => l.id)}
    />
  );
}
