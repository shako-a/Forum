import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getFeaturedAdminRows } from "@/lib/featured";
import { MODULES, MODULE_META, isModuleKey, type ModuleKey } from "@/lib/modules";
import { FeaturedAdmin } from "@/components/admin/FeaturedAdmin";

export const dynamic = "force-dynamic";

// Admin → Featured: the "TOP listings" bar for each of the five modules.
export default async function AdminFeaturedPage({ params, searchParams }: PageProps<"/[lang]/admin/featured">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const tab: ModuleKey = isModuleKey(sp.tab) ? sp.tab : "business";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [current, results] = await Promise.all([
    getFeaturedAdminRows(tab, lang),
    q ? getFeaturedAdminRows(tab, lang, q) : Promise.resolve([]),
  ]);
  const t = dict.admin;
  const base = `/${lang}/admin/featured`;

  return (
    <div>
      <h1 className="admin-h1">★ {t.featuredAdmin}</h1>
      <p className="muted-sm" style={{ marginBottom: 16, maxWidth: 760 }}>{t.featuredSub}</p>
      <div className="admin-tabs">
        {MODULES.map((m) => (
          <Link key={m} href={`${base}?tab=${m}`} className={`admin-tab${tab === m ? " active" : ""}`}>
            {MODULE_META[m].icon} {dict.modules[m]}
          </Link>
        ))}
      </div>
      <FeaturedAdmin locale={lang} dict={dict} module={tab} current={current} results={results} q={q} />
    </div>
  );
}
