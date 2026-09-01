import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  AUDITED_MODELS,
  AUDIT_EVENTS,
  AUDIT_OUTCOMES,
  AUDIT_PER,
  AUDIT_QUICK,
  AUDIT_SEVERITIES,
  auditQuery,
  auditWhere,
  parseAuditFilters,
  type AuditQuick,
} from "@/lib/audit-query";
import { ActivityTable } from "@/components/admin/ActivityTable";

export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");

// Tile windows. Kept outside the component so the render body stays pure.
function windows() {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { dayStart, weekAgo };
}

export default async function AdminActivityPage({ params, searchParams }: PageProps<"/[lang]/admin/activity">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // the log names members and IPs — admins only
  const dict = await getDictionary(lang);
  const t = dict.admin.activity;
  const base = `/${lang}/admin/activity`;

  const filters = parseAuditFilters(await searchParams);
  const where = auditWhere(filters);
  const skip = (filters.page - 1) * filters.per;

  const { dayStart, weekAgo } = windows();

  const [rows, total, today, warnings7d, denied7d, actorsToday, ipsToday] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { at: "desc" }, skip, take: filters.per }),
    db.auditLog.count({ where }),
    db.auditLog.count({ where: { at: { gte: dayStart } } }),
    db.auditLog.count({ where: { at: { gte: weekAgo }, severity: "warning" } }),
    db.auditLog.count({ where: { at: { gte: weekAgo }, outcome: "denied" } }),
    db.auditLog.groupBy({ by: ["actorId"], where: { at: { gte: dayStart }, actorId: { not: null } } }).then((g) => g.length),
    db.auditLog.groupBy({ by: ["ip"], where: { at: { gte: dayStart }, ip: { not: null } } }).then((g) => g.length),
  ]);

  const todayYmd = dayStart.toISOString().slice(0, 10);
  const weekYmd = weekAgo.toISOString().slice(0, 10);
  const tiles = [
    { label: t.tileToday, value: today, icon: "🧾", href: `${base}?from=${todayYmd}` },
    { label: t.tileWarnings, value: warnings7d, icon: "⚠️", href: `${base}?severity=warning&from=${weekYmd}` },
    { label: t.tileDenied, value: denied7d, icon: "⛔", href: `${base}?outcome=denied&from=${weekYmd}` },
    { label: t.tileActors, value: actorsToday, icon: "👥", href: `${base}?quick=staff&from=${todayYmd}` },
    { label: t.tileIps, value: ipsToday, icon: "🌐", href: `${base}?from=${todayYmd}` },
  ];

  const quickLabel: Record<AuditQuick, string> = {
    all: t.quickAll,
    security: t.quickSecurity,
    staff: t.quickStaff,
    auth: t.quickAuth,
    content: t.quickContent,
    listings: t.quickListings,
    users: t.quickUsers,
    messages: t.quickMessages,
  };
  const ev = t.ev as Record<string, string>;
  const models = t.models as Record<string, string>;
  const sevLabel: Record<string, string> = { info: t.sevInfo, notice: t.sevNotice, warning: t.sevWarning };
  const outLabel: Record<string, string> = { ok: t.outOk, denied: t.outDenied, failed: t.outFailed };
  const opOptions: [string, string][] = [
    [".create", t.opCreate],
    [".update", t.opUpdate],
    [".delete", t.opDelete],
    [".updateMany", t.opUpdateMany],
    [".deleteMany", t.opDeleteMany],
  ];

  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + rows.length, total);
  const lastPage = Math.max(1, Math.ceil(total / filters.per));
  const exportHref = `/api/admin/activity${auditQuery(filters)}`;

  return (
    <div>
      <h1 className="admin-h1">🧾 {t.title}</h1>
      <p className="muted-sm" style={{ marginBottom: 16, maxWidth: 760 }}>{t.sub}</p>

      <div className="admin-stats">
        {tiles.map((s) => (
          <Link key={s.label} href={s.href} className="admin-stat admin-stat-link">
            <span className="admin-stat-ico" aria-hidden="true">{s.icon}</span>
            <span className="admin-stat-value">{num(s.value)}</span>
            <span className="admin-stat-label">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="audit-quick">
        {AUDIT_QUICK.map((q) => (
          <Link key={q} href={`${base}${auditQuery(filters, { quick: q })}`} className={filters.quick === q ? "on" : ""}>
            {quickLabel[q]}
          </Link>
        ))}
      </div>

      {/* Plain GET form: the URL is the filter state, so a view can be bookmarked or pasted into a ticket. */}
      <form method="get" action={base} className="audit-filters">
        {filters.quick !== "all" && <input type="hidden" name="quick" value={filters.quick} />}
        {filters.target && <input type="hidden" name="target" value={filters.target} />}
        {filters.req && <input type="hidden" name="req" value={filters.req} />}
        <label className="audit-search">
          {t.filterSearch}
          <input className="input" type="search" name="q" defaultValue={filters.q} placeholder={t.filterSearch} />
        </label>
        <label>
          {t.filterActor}
          <input className="input" type="text" name="actor" defaultValue={filters.actor} />
        </label>
        <label>
          {t.filterModel}
          <select className="input" name="model" defaultValue={filters.model}>
            <option value="">{t.any}</option>
            {AUDITED_MODELS.map((m) => (
              <option key={m} value={m}>{models[m] ?? m}</option>
            ))}
          </select>
        </label>
        <label>
          {t.filterAction}
          <select className="input" name="action" defaultValue={filters.action}>
            <option value="">{t.any}</option>
            {opOptions.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
            {AUDIT_EVENTS.map((a) => (
              <option key={a} value={a}>{ev[a] ?? a}</option>
            ))}
          </select>
        </label>
        <label>
          {t.filterSeverity}
          <select className="input" name="severity" defaultValue={filters.severity}>
            <option value="">{t.any}</option>
            {AUDIT_SEVERITIES.map((s) => (
              <option key={s} value={s}>{sevLabel[s]}</option>
            ))}
          </select>
        </label>
        <label>
          {t.filterOutcome}
          <select className="input" name="outcome" defaultValue={filters.outcome}>
            <option value="">{t.any}</option>
            {AUDIT_OUTCOMES.map((o) => (
              <option key={o} value={o}>{outLabel[o]}</option>
            ))}
          </select>
        </label>
        <label>
          {t.filterIp}
          <input className="input" type="text" name="ip" defaultValue={filters.ip} inputMode="numeric" />
        </label>
        <label>
          {t.filterFrom}
          <input className="input" type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          {t.filterTo}
          <input className="input" type="date" name="to" defaultValue={filters.to} />
        </label>
        <label>
          {t.filterPer}
          <select className="input" name="per" defaultValue={String(filters.per)}>
            {AUDIT_PER.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="audit-filters-actions">
          <Link href={base} className="btn btn-ghost btn-sm">{t.reset}</Link>
          <button type="submit" className="btn btn-primary btn-sm">{t.apply}</button>
        </div>
      </form>

      <div className="audit-meta">
        <span>{t.showing.replace("{from}", num(from)).replace("{to}", num(to)).replace("{total}", num(total))}</span>
        <a href={exportHref} className="btn btn-ghost btn-sm" title={t.exportHint}>
          ⬇ {t.export}
        </a>
      </div>

      <ActivityTable rows={rows} dict={dict} locale={lang} filters={filters} />

      {total > filters.per && (
        <div className="audit-pager">
          {filters.page > 1 ? (
            <Link href={`${base}${auditQuery(filters, { page: filters.page - 1 })}`} className="btn btn-ghost btn-sm">{t.prev}</Link>
          ) : (
            <span />
          )}
          <span className="muted-sm">{filters.page} / {lastPage}</span>
          {filters.page < lastPage ? (
            <Link href={`${base}${auditQuery(filters, { page: filters.page + 1 })}`} className="btn btn-ghost btn-sm">{t.next}</Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
