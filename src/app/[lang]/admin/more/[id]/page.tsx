import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  PackageEdit,
  type EditablePackage,
  type PickableFeature,
} from "@/components/admin/PackageEdit";

export const dynamic = "force-dynamic";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in *local* time; an
// ISO string would be UTC and silently shift the admin's entered time.
function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// One route serves both "create" (/new) and "edit" (/<id>), since the form is
// identical apart from which action it posts to.
export default async function AdminPackageEditPage({
  params,
}: PageProps<"/[lang]/admin/more/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  const featureRows = await db.feature.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const features: PickableFeature[] = featureRows.map((f) => ({
    id: f.id,
    key: f.key,
    name: lang === "ka" ? f.nameKa : f.nameEn,
  }));

  if (id === "new") {
    return <PackageEdit locale={lang} dict={dict} features={features} />;
  }

  const row = await db.paidPackage.findUnique({
    where: { id },
    include: { features: true },
  });
  if (!row) notFound();

  const pkg: EditablePackage = {
    id: row.id,
    key: row.key,
    slug: row.slug,
    isBuiltIn: row.isBuiltIn,
    nameEn: row.nameEn,
    nameKa: row.nameKa,
    blurbEn: row.blurbEn,
    blurbKa: row.blurbKa,
    pitchEn: row.pitchEn,
    pitchKa: row.pitchKa,
    icon: row.icon,
    accent: row.accent,
    priceCents: row.priceCents,
    discountType: row.discountType,
    discountPercent: row.discountPercent,
    discountPriceCents: row.discountPriceCents,
    discountStartsAt: forInput(row.discountStartsAt),
    discountEndsAt: forInput(row.discountEndsAt),
    isActive: row.isActive,
    featured: row.featured,
    sortOrder: row.sortOrder,
    selected: Object.fromEntries(row.features.map((pf) => [pf.featureId, pf.included])),
  };

  return <PackageEdit locale={lang} dict={dict} pkg={pkg} features={features} />;
}
