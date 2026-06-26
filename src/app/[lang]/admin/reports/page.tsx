import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { ReportsAdmin, type AdminReport } from "@/components/admin/ReportsAdmin";

export default async function AdminReportsPage({ params }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  const rows = await db.report
    .findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        reporter: { select: { forumName: true } },
        reportedUser: { select: { forumName: true } },
      },
    })
    .catch(() => []);

  const reports: AdminReport[] = rows.map((r) => ({
    id: r.id,
    reporter: r.reporter.forumName,
    reported: r.reportedUser?.forumName ?? null,
    reason: r.reason,
    context: r.context,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ReportsAdmin dict={dict} reports={reports} />;
}
