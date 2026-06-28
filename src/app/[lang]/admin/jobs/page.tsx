import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { JobsAdmin, type AdminJob } from "@/components/admin/JobsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage({ params }: PageProps<"/[lang]/admin/jobs">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  const rows = await db.jobPosting
    .findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        active: true,
        business: { select: { slug: true, name: true } },
      },
    })
    .catch(() => []);

  const jobs: AdminJob[] = rows.map((j) => ({
    id: j.id,
    title: j.title,
    location: [j.city, j.state].filter(Boolean).join(", "),
    active: j.active,
    business: j.business,
  }));

  return <JobsAdmin locale={lang} dict={dict} jobs={jobs} />;
}
