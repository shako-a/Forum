import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { AdminNav } from "@/components/AdminNav";

// Admin is always per-request (role check + live data) — applies to all sub-routes.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Secure gate: only administrators reach the admin panel.
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-1">
      <AdminNav locale={lang} dict={dict} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
