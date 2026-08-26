import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import Link from "next/link";
import { AdminUserEdit } from "@/components/admin/AdminUserEdit";
import { UserUploads } from "@/components/admin/UserUploads";
import { ActivityTable } from "@/components/admin/ActivityTable";
import { parseAuditFilters } from "@/lib/audit-query";

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
        isPro: true,
        isSupporter: true,
        canAccessAdmin: true,
        canRevealAnon: true,
        isOwner: true,
        createdAt: true,
        labels: { select: { id: true } },
        _count: { select: { posts: true, replies: true } },
      },
    }),
    db.label.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user) notFound();

  // Built-in packages are granted through the User booleans in the form; only
  // admin-created ones need an explicit grant toggle.
  const customPackageRows = await db.paidPackage.findMany({
    where: { isBuiltIn: false },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameEn: true, nameKa: true, icon: true },
  });
  const customPackages = customPackageRows.map((p) => ({
    id: p.id,
    name: lang === "ka" ? p.nameKa : p.nameEn,
    icon: p.icon,
  }));
  const [heldPackageIds, uploads, activity] = await Promise.all([
    db.userPackage
      .findMany({ where: { userId: id }, select: { packageId: true } })
      .then((rows) => rows.map((r) => r.packageId)),
    db.mediaUpload.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, url: true, contentType: true, size: true, createdAt: true },
    }),
    // What this account did, and what was done to it — both matter when a
    // member is under review.
    db.auditLog.findMany({
      where: { OR: [{ actorId: id }, { model: "User", targetId: id }] },
      orderBy: { at: "desc" },
      take: 15,
    }),
  ]);
  const ta = dict.admin.activity;
  const activityBase = `/${lang}/admin/activity`;

  return (
    <>
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
        isPro: user.isPro,
        isSupporter: user.isSupporter,
        canAccessAdmin: user.canAccessAdmin,
        canRevealAnon: user.canRevealAnon,
        isOwner: user.isOwner,
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
      customPackages={customPackages}
      heldPackageIds={heldPackageIds}
    />
    <UserUploads
      dict={dict}
      uploads={uploads.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
    />
    <div className="admin-section">
      <h2 className="admin-section-title">🧾 {ta.userSection}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{ta.userSectionSub}</p>
      <div className="audit-links" style={{ marginBottom: 8 }}>
        <Link href={`${activityBase}?actor=${id}`} className="admin-link">{ta.userAll} →</Link>
        <Link href={`${activityBase}?model=User&target=${id}`} className="admin-link">{ta.userHistory} →</Link>
      </div>
      {activity.length === 0 ? (
        <p className="muted-sm">{ta.none}</p>
      ) : (
        <ActivityTable rows={activity} dict={dict} locale={lang} filters={parseAuditFilters({})} compact />
      )}
    </div>
    </>
  );
}
