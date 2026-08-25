import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { MerchProductForm } from "@/components/admin/MerchProductForm";

export const dynamic = "force-dynamic";

export default async function EditMerchProductPage({ params }: PageProps<"/[lang]/admin/merch/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const product = await db.merchProduct.findUnique({
    where: { id },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) notFound();

  return (
    <div>
      <Link href={`/${lang}/admin/merch`} className="btn btn-ghost btn-sm biz-back">‹ {dict.admin.merchProducts}</Link>
      <div className="admin-list-head">
        <h1 className="admin-h1">{product.name}</h1>
        <a href={`/${lang}/market/merch/${product.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↗ {dict.admin.viewSite}</a>
      </div>
      <MerchProductForm
        locale={lang}
        dict={dict}
        values={{
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.priceCents / 100,
          photos: product.photos,
          active: product.active,
          featured: product.featured,
          sortOrder: product.sortOrder,
          variants: product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            sku: v.sku ?? "",
            stock: v.stock,
            priceDelta: v.priceDeltaCents / 100,
          })),
        }}
      />
    </div>
  );
}
