import Link from "@/components/Link";
import type { AuditLog } from "@/generated/prisma/client";
import { IdCell } from "@/components/admin/IdCell";
import { auditQuery, auditTargetHref, type AuditFilters } from "@/lib/audit-query";
import { timeAgo } from "@/lib/format";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Server-rendered rows for the activity log. Every id, IP and request id is a
// link that narrows the log to it, so an investigation is a series of clicks:
// "what else did this account do" → "what else came from that IP" → "what
// else happened in that request". Details expand with <details>, no JS.

type Change = { from: unknown; to: unknown };

function fmt(v: unknown, max = 60): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "string") return v.length > max ? `${v.slice(0, max - 1)}…` : v;
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "truncated" in v) {
    const t = v as { length?: number; preview?: string };
    return `{${t.length ?? "?"} chars} ${t.preview ? fmt(t.preview, max) : ""}`.trim();
  }
  const s = JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function pretty(v: unknown): string {
  return JSON.stringify(v, null, 2);
}

const utc = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

export function ActivityTable({
  rows,
  dict,
  locale,
  filters,
  compact = false,
}: {
  rows: AuditLog[];
  dict: Dictionary;
  locale: Locale;
  filters: AuditFilters;
  compact?: boolean;
}) {
  const t = dict.admin.activity;
  const base = `/${locale}/admin/activity`;
  const ev = t.ev as Record<string, string>;
  const models = t.models as Record<string, string>;
  const opLabel: Record<string, string> = {
    create: t.opCreate,
    update: t.opUpdate,
    delete: t.opDelete,
    updateMany: t.opUpdateMany,
    updateManyAndReturn: t.opUpdateMany,
    deleteMany: t.opDeleteMany,
    createMany: t.opCreateMany,
    createManyAndReturn: t.opCreateMany,
  };
  const sevLabel: Record<string, string> = { info: t.sevInfo, notice: t.sevNotice, warning: t.sevWarning };
  const outLabel: Record<string, string> = { ok: t.outOk, denied: t.outDenied, failed: t.outFailed };

  const actionLabel = (r: AuditLog) => {
    if (ev[r.action]) return ev[r.action];
    const dot = r.action.lastIndexOf(".");
    if (r.model && dot > 0) {
      const op = r.action.slice(dot + 1);
      return `${models[r.model] ?? r.model} · ${opLabel[op] ?? op}`;
    }
    return r.action;
  };

  const filterLink = (patch: Parameters<typeof auditQuery>[1]) => `${base}${auditQuery(filters, patch)}`;

  if (rows.length === 0) return <p className="muted-sm">{t.empty}</p>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table audit-table">
        <thead>
          <tr>
            <th>{t.colWhen}</th>
            <th>{t.colActor}</th>
            <th>{t.colAction}</th>
            <th>{t.colTarget}</th>
            <th>{t.colSummary}</th>
            <th>{t.colIp}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changes = (r.changes ?? null) as Record<string, Change> | null;
            const changeKeys = changes ? Object.keys(changes) : [];
            const href = auditTargetHref(locale, r.model, r.targetId, r.meta);
            const meta = (r.meta ?? null) as Record<string, unknown> | null;
            const sevClass = r.severity !== "info" ? ` audit-row-${r.severity}` : "";
            return (
              <tr key={r.id} className={`audit-row${sevClass}`}>
                <td className="audit-when">
                  <time dateTime={r.at.toISOString()} title={`${r.at.toISOString()}`}>
                    {utc(r.at)}
                  </time>
                  <div className="muted-sm">{timeAgo(r.at, locale)}</div>
                </td>
                <td>
                  {r.actorId ? (
                    <Link href={filterLink({ actor: r.actorId })} className="admin-link" title={t.byActor}>
                      {r.actorName ?? r.actorId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="muted-sm">{r.actorName ?? t.guest}</span>
                  )}
                  {r.actorRole && r.actorRole !== "USER" && (
                    <span className={`audit-role audit-role-${r.actorRole.toLowerCase()}`}>{r.actorRole}</span>
                  )}
                  {r.actingAsId && (
                    <div className="muted-sm" title={r.actingAsId}>
                      🏢 {t.actingAs}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`audit-chip audit-sev-${r.severity}`} title={sevLabel[r.severity] ?? r.severity}>
                    {actionLabel(r)}
                  </span>
                  {r.outcome !== "ok" && <span className="audit-outcome">{outLabel[r.outcome] ?? r.outcome}</span>}
                </td>
                <td>
                  {r.targetLabel &&
                    (href ? (
                      <Link href={href} className="admin-link" title={t.open}>
                        {r.targetLabel}
                      </Link>
                    ) : (
                      <span>{r.targetLabel}</span>
                    ))}
                  {r.targetId && (
                    <div>
                      <IdCell id={r.targetId} />
                      {r.model && (
                        <Link href={filterLink({ model: r.model, target: r.targetId, quick: null })} className="muted-sm" title={t.onTarget}>
                          ⟲
                        </Link>
                      )}
                    </div>
                  )}
                  {!r.targetLabel && !r.targetId && r.model && <span className="muted-sm">{models[r.model] ?? r.model}</span>}
                </td>
                <td className="audit-summary">
                  <div>{r.summary}</div>
                  {changeKeys.length > 0 && (
                    <div className="audit-changes">
                      {changeKeys.slice(0, compact ? 2 : 4).map((k) => (
                        <span key={k} className="audit-change">
                          <b>{k}</b>: <span className="audit-from">{fmt(changes![k].from, 40)}</span> → <span className="audit-to">{fmt(changes![k].to, 40)}</span>
                        </span>
                      ))}
                      {changeKeys.length > (compact ? 2 : 4) && <span className="audit-change">+{changeKeys.length - (compact ? 2 : 4)}</span>}
                    </div>
                  )}
                  {!compact && (
                    <details className="audit-details">
                      <summary>{t.details}</summary>
                      <div className="audit-detail-body">
                        {changes && changeKeys.length > 0 && (
                          <table className="audit-diff">
                            <thead>
                              <tr>
                                <th>{t.field}</th>
                                <th>{t.before}</th>
                                <th>{t.after}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changeKeys.map((k) => (
                                <tr key={k}>
                                  <td>{k}</td>
                                  <td className="audit-from">{pretty(changes[k].from)}</td>
                                  <td className="audit-to">{pretty(changes[k].to)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <dl className="audit-kv">
                          <dt>{t.colAction}</dt>
                          <dd>
                            <code>{r.action}</code> · {sevLabel[r.severity] ?? r.severity} · {outLabel[r.outcome] ?? r.outcome}
                          </dd>
                          {r.path && (
                            <>
                              <dt>{t.path}</dt>
                              <dd>{r.path}</dd>
                            </>
                          )}
                          {r.userAgent && (
                            <>
                              <dt>{t.userAgent}</dt>
                              <dd>{r.userAgent}</dd>
                            </>
                          )}
                          {r.requestId && (
                            <>
                              <dt>{t.request}</dt>
                              <dd>
                                <code>{r.requestId.slice(0, 8)}</code>{" "}
                                <Link href={filterLink({ req: r.requestId, quick: null })} className="admin-link">
                                  {t.sameRequest}
                                </Link>
                              </dd>
                            </>
                          )}
                          {r.actingAsId && (
                            <>
                              <dt>{t.actingAs}</dt>
                              <dd>
                                <code>{r.actingAsId}</code>
                              </dd>
                            </>
                          )}
                        </dl>
                        {r.snapshot != null && (
                          <div>
                            <div className="muted-sm" style={{ marginBottom: 4 }}>{t.snapshot}</div>
                            <pre className="audit-pre">{pretty(r.snapshot)}</pre>
                          </div>
                        )}
                        {meta && Object.keys(meta).length > 0 && (
                          <div>
                            <div className="muted-sm" style={{ marginBottom: 4 }}>{t.meta}</div>
                            <pre className="audit-pre">{pretty(meta)}</pre>
                          </div>
                        )}
                        <div className="audit-links">
                          {r.actorId && (
                            <Link href={filterLink({ actor: r.actorId, quick: null })} className="admin-link">
                              {t.byActor}
                            </Link>
                          )}
                          {r.model && r.targetId && (
                            <Link href={filterLink({ model: r.model, target: r.targetId, quick: null })} className="admin-link">
                              {t.onTarget}
                            </Link>
                          )}
                          {r.ip && (
                            <Link href={filterLink({ ip: r.ip, quick: null })} className="admin-link">
                              {t.fromIp}
                            </Link>
                          )}
                        </div>
                      </div>
                    </details>
                  )}
                </td>
                <td>
                  {r.ip ? (
                    <Link href={filterLink({ ip: r.ip })} className="audit-ip admin-link" title={t.fromIp}>
                      {r.ip}
                    </Link>
                  ) : (
                    <span className="muted-sm">—</span>
                  )}
                  {r.country && <div className="muted-sm">{r.country}</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
