import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { LabelAdmin, type AdminLabel } from "@/components/admin/LabelAdmin";

export const dynamic = "force-dynamic";

export default async function AdminLabelsPage({ params }: PageProps<"/[lang]/admin/labels">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // labels are admin-only
  const dict = await getDictionary(lang);

  const rows = await db.label
    .findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { users: true } } },
    })
    .catch(() => []);

  const labels: AdminLabel[] = rows.map((l) => ({
    id: l.id,
    nameEn: l.nameEn,
    nameKa: l.nameKa,
    color: l.color,
    background: l.background,
    font: l.font,
    bold: l.bold,
    sortOrder: l.sortOrder,
    userCount: l._count.users,
  }));

  return <LabelAdmin locale={lang} dict={dict} labels={labels} />;
}
