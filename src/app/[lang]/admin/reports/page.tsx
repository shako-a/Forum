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
        post: { select: { slug: true } },
        reply: { select: { id: true, post: { select: { slug: true } } } },
      },
    })
    .catch(() => []);

  const td = dict.admin;
  const reports: AdminReport[] = rows.map((r) => {
    let target: { href: string; label: string } | null = null;
    if (r.reply?.post) {
      target = { href: `/${lang}/p/${r.reply.post.slug}#r-${r.reply.id}`, label: td.reportReply };
    } else if (r.post) {
      target = { href: `/${lang}/p/${r.post.slug}`, label: td.reportPost };
    } else if (r.conversationId) {
      target = { href: `/${lang}/inbox`, label: td.reportDm };
    }
    return {
      id: r.id,
      reporter: r.reporter.forumName,
      reported: r.reportedUser?.forumName ?? null,
      reason: r.reason,
      context: r.context,
      target,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return <ReportsAdmin dict={dict} reports={reports} />;
}
