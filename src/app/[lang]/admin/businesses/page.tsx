import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { BusinessAdmin, type AdminBusiness } from "@/components/admin/BusinessAdmin";

export default async function AdminBusinessesPage({ params }: PageProps<"/[lang]/admin/businesses">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  const businesses = await db.business
    .findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        verified: true,
        featured: true,
        ratingCount: true,
        owner: { select: { forumName: true } },
      },
    })
    .catch(() => []);

  return <BusinessAdmin dict={dict} locale={lang} businesses={businesses as AdminBusiness[]} />;
}
