import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { getInteractionStats, getApproachedBusinesses, getRecentInteractions } from "@/lib/listing-interactions";
import { MODULES, MODULE_META, INTERACTION_KINDS, isModuleKey, isInteractionKind, listingPath, type InteractionKind, type ModuleKey } from "@/lib/modules";
import { timeAgo } from "@/lib/format";
import type { Dictionary } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

const DAY_OPTIONS = [7, 30, 90] as const;
const num = (n: number) => n.toLocaleString("en-US");

// Outside the component so the render body stays pure.
function sinceDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Kinds map onto the listing page's own button labels, so the admin reads the
// same words the visitor pressed.
function kindLabel(kind: string, dict: Dictionary): string {
  const L = dict.listing;
  switch (kind as InteractionKind) {
    case "call": return `📞 ${L.call}`;
    case "whatsapp": return `💬 ${L.whatsapp}`;
    case "email": return `✉️ ${L.email}`;
    case "website": return `🌐 ${L.website}`;
    case "booking": return `📅 ${L.booking}`;
    case "directions": return `📍 ${L.directions}`;
    case "social": return `🔗 ${L.social}`;
    case "share": return `↗ ${L.share}`;
    case "message": return `✉️ ${L.message}`;
    default: return kind;
  }
}

// Admin → Enquiries: the contact ledger, read for marketing — which
// businesses are being approached, through which channel, how often.
export default async function AdminEnquiriesPage({ params, searchParams }: PageProps<"/[lang]/admin/enquiries">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const t = dict.admin;
  const sp = await searchParams;

  const days = DAY_OPTIONS.includes(Number(sp.days) as (typeof DAY_OPTIONS)[number]) ? Number(sp.days) : 30;
  const mod: ModuleKey | undefined = isModuleKey(sp.module) ? sp.module : undefined;
  const kind: InteractionKind | undefined = isInteractionKind(sp.kind) ? sp.kind : undefined;
  const since = sinceDaysAgo(days);
  const base = `/${lang}/admin/enquiries`;

  const [stats, byBusiness, recent] = await Promise.all([
    getInteractionStats(since, mod),
    getApproachedBusinesses(since),
    getRecentInteractions({ since, module: mod, kind, take: 150 }),
  ]);

  const tiles: Array<{ label: string; value: number; icon: string }> = [
    { label: t.enqTileTotal, value: stats.total, icon: "📨" },
    { label: t.enqTileMessages, value: stats.byKind.message ?? 0, icon: "✉️" },
    { label: t.enqTileCalls, value: stats.byKind.call ?? 0, icon: "📞" },
    { label: t.enqTileWhatsapp, value: stats.byKind.whatsapp ?? 0, icon: "💬" },
    { label: t.enqTileEmail, value: stats.byKind.email ?? 0, icon: "📧" },
    { label: t.enqTileWebsite, value: stats.byKind.website ?? 0, icon: "🌐" },
    { label: t.enqTileDirections, value: stats.byKind.directions ?? 0, icon: "📍" },
  ];
  const kindCols: InteractionKind[] = ["message", "call", "whatsapp", "email", "website", "directions"];

  return (
    <div>
      <h1 className="admin-h1">📨 {t.enquiries}</h1>
      <p className="muted-sm" style={{ marginBottom: 16, maxWidth: 760 }}>{t.enqSub}</p>

      <form method="get" className="admin-filter-row">
        <select className="input" name="days" defaultValue={String(days)}>
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>{t.enqDays.replace("{n}", String(d))}</option>
          ))}
        </select>
        <select className="input" name="module" defaultValue={mod ?? ""}>
          <option value="">{t.enqAll}</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>{MODULE_META[m].icon} {dict.modules[m]}</option>
          ))}
        </select>
        <select className="input" name="kind" defaultValue={kind ?? ""}>
          <option value="">{t.enqAnyKind}</option>
          {INTERACTION_KINDS.map((k) => (
            <option key={k} value={k}>{kindLabel(k, dict)}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost btn-sm">{t.activity.apply}</button>
        <Link href={base} className="btn btn-ghost btn-sm">{t.activity.reset}</Link>
      </form>

      <div className="admin-stats" style={{ marginBottom: 20 }}>
        {tiles.map((s) => (
          <div key={s.label} className="admin-stat">
            <span className="admin-stat-ico" aria-hidden="true">{s.icon}</span>
            <span className="admin-stat-value">{num(s.value)}</span>
            <span className="admin-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">🏢 {t.enqByBusiness}</h2>
        {byBusiness.length === 0 ? (
          <p className="muted-sm">{t.enqNone}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-rownum">#</th>
                <th>{t.enqBusiness}</th>
                {kindCols.map((k) => (
                  <th key={k}>{kindLabel(k, dict)}</th>
                ))}
                <th>{t.enqTotal}</th>
                <th>{t.enqLast}</th>
              </tr>
            </thead>
            <tbody>
              {byBusiness.map((b, i) => (
                <tr key={b.businessId}>
                  <td className="admin-rownum">{i + 1}</td>
                  <td>
                    <Link href={`/${lang}/business/${b.slug}`} className="admin-user-link">{b.name}</Link>
                  </td>
                  {kindCols.map((k) => (
                    <td key={k}>{b.byKind[k] ? num(b.byKind[k]!) : <span className="opacity-30">—</span>}</td>
                  ))}
                  <td><strong>{num(b.total)}</strong></td>
                  <td className="muted-sm">{timeAgo(b.lastAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">🧾 {t.enqRecent}</h2>
        {recent.length === 0 ? (
          <p className="muted-sm">{t.enqNone}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t.enqWhen}</th>
                <th>{t.enqModule}</th>
                <th>{t.enqListing}</th>
                <th>{t.enqBusiness}</th>
                <th>{t.enqKind}</th>
                <th>{t.enqFrom}</th>
                <th>{t.enqTo}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const mod = isModuleKey(r.module) ? r.module : null;
                return (
                  <tr key={r.id}>
                    <td className="muted-sm" title={r.createdAt.toISOString()}>{timeAgo(r.createdAt, lang)}</td>
                    <td>{mod ? `${MODULE_META[mod].icon} ${dict.modules[mod]}` : r.module}</td>
                    <td>
                      {mod ? (
                        <Link href={`/${lang}${listingPath(mod, r.listingSlug)}`} className="admin-user-link">{r.listingTitle}</Link>
                      ) : (
                        r.listingTitle
                      )}
                      {r.body && <div className="muted-sm" style={{ maxWidth: 360 }}>“{r.body.slice(0, 120)}{r.body.length > 120 ? "…" : ""}”</div>}
                    </td>
                    <td>{r.business ? <Link href={`/${lang}/business/${r.business.slug}`} className="admin-link">{r.business.name}</Link> : <span className="opacity-30">—</span>}</td>
                    <td>{kindLabel(r.kind, dict)}</td>
                    <td>{r.sender?.forumName ?? <span className="muted-sm">{t.enqGuest}</span>}</td>
                    <td className="muted-sm">{r.recipient?.forumName ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
