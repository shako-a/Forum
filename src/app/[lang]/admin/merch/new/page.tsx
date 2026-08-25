import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { MerchProductForm } from "@/components/admin/MerchProductForm";

export const dynamic = "force-dynamic";

export default async function NewMerchProductPage({ params }: PageProps<"/[lang]/admin/merch/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  return (
    <div>
      <Link href={`/${lang}/admin/merch`} className="btn btn-ghost btn-sm biz-back">‹ {dict.admin.merchProducts}</Link>
      <h1 className="admin-h1">{dict.admin.merchNewProduct}</h1>
      <MerchProductForm locale={lang} dict={dict} />
    </div>
  );
}
