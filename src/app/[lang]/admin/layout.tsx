import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdminPanel } from "@/lib/dal";
import { AdminNav } from "@/components/AdminNav";
import { AdminTopbar } from "@/components/AdminTopbar";

// Admin is always per-request (role check + live data) — applies to all sub-routes.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Gate: admins (full panel) or moderators with the per-mod grant (moderation
  // only). Section-level access is enforced in each sub-route too.
  const me = await requireAdminPanel(lang);
  const isAdmin = me.role === "ADMIN";
  const dict = await getDictionary(lang);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href={`/${lang}/admin`} className="admin-brand">
          <span className="admin-mark" aria-hidden="true">
            🛡
          </span>
          <span>
            {dict.common.appName}
            <small>{dict.admin.title}</small>
          </span>
        </Link>
        <AdminNav locale={lang} dict={dict} isAdmin={isAdmin} />
        <Link href={`/${lang}`} className="admin-back">
          ← {dict.admin.viewSite}
        </Link>
      </aside>

      <div className="admin-body">
        <AdminTopbar locale={lang} dict={dict} userName={me.forumName} role={me.role} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
