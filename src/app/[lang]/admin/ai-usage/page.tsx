import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

const usd = (micro: number) => "$" + (micro / 1_000_000).toFixed(micro >= 1_000_000 ? 2 : 4);
const num = (n: number) => n.toLocaleString("en-US");

export default async function AdminAiUsagePage({ params }: PageProps<"/[lang]/admin/ai-usage">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const t = dict.admin;

  // Calendar-month boundary for the "this month" column.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisMonth, byModel, byKind, topRows] = await Promise.all([
    db.aiUsage.aggregate({ _sum: { costMicroUsd: true, tokensIn: true, tokensOut: true }, _count: { _all: true } }),
    db.aiUsage.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicroUsd: true },
      _count: { _all: true },
    }),
    db.aiUsage.groupBy({
      by: ["model"],
      _sum: { costMicroUsd: true, tokensIn: true, tokensOut: true },
      _count: { _all: true },
    }),
    db.aiUsage.groupBy({ by: ["kind"], _sum: { costMicroUsd: true }, _count: { _all: true } }),
    db.aiUsage.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      _sum: { costMicroUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { costMicroUsd: "desc" } },
      take: 25,
    }),
  ]);

  const userIds = topRows.map((r) => r.userId!).filter(Boolean);
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, forumName: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.forumName]));

  const kindLabel = (k: string) => (k === "summary" ? t.aiKindSummary : k === "ask" ? t.aiKindAsk : k);

  return (
    <div>
      <h1 className="admin-h1">{t.aiUsage}</h1>
      <p className="muted-sm" style={{ marginBottom: 16 }}>{t.aiUsageSub}</p>

      {!isAiConfigured() && (
        <p className="auth-alert" style={{ marginBottom: 16 }}>⚠ {t.aiNotConfigured}</p>
      )}

      {/* Headline stats */}
      <div className="admin-stats" style={{ marginBottom: 20 }}>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">💸</span>
          <span className="admin-stat-value">{usd(thisMonth._sum.costMicroUsd ?? 0)}</span>
          <span className="admin-stat-label">{t.aiCostThisMonth}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">∑</span>
          <span className="admin-stat-value">{usd(allTime._sum.costMicroUsd ?? 0)}</span>
          <span className="admin-stat-label">{t.aiCostAllTime}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">✦</span>
          <span className="admin-stat-value">{num(thisMonth._count._all)}</span>
          <span className="admin-stat-label">{t.aiCallsThisMonth}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">📊</span>
          <span className="admin-stat-value">{num(allTime._count._all)}</span>
          <span className="admin-stat-label">{t.aiCallsAllTime}</span>
        </div>
      </div>

      {allTime._count._all === 0 ? (
        <div className="card card-pad muted-sm">{t.aiNoUsage}</div>
      ) : (
        <div className="ai-usage-tables">
          {/* By model */}
          <div className="card card-pad">
            <h2 className="admin-h2">{t.aiByModel}</h2>
            <table className="admin-table">
              <thead>
                <tr><th>{t.aiModel}</th><th>{t.aiCalls}</th><th>{t.aiTokens}</th><th>{t.aiCost}</th></tr>
              </thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={m.model}>
                    <td>{m.model}</td>
                    <td>{num(m._count._all)}</td>
                    <td>{num((m._sum.tokensIn ?? 0) + (m._sum.tokensOut ?? 0))}</td>
                    <td>{usd(m._sum.costMicroUsd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* By kind */}
          <div className="card card-pad">
            <h2 className="admin-h2">{t.aiByKind}</h2>
            <table className="admin-table">
              <thead>
                <tr><th>{t.aiKind}</th><th>{t.aiCalls}</th><th>{t.aiCost}</th></tr>
              </thead>
              <tbody>
                {byKind.map((k) => (
                  <tr key={k.kind}>
                    <td>{kindLabel(k.kind)}</td>
                    <td>{num(k._count._all)}</td>
                    <td>{usd(k._sum.costMicroUsd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top users */}
          <div className="card card-pad">
            <h2 className="admin-h2">{t.aiTopUsers}</h2>
            <table className="admin-table">
              <thead>
                <tr><th>{t.aiUser}</th><th>{t.aiCalls}</th><th>{t.aiCost}</th></tr>
              </thead>
              <tbody>
                {topRows.map((r) => (
                  <tr key={r.userId}>
                    <td>{nameOf.get(r.userId!) ?? "—"}</td>
                    <td>{num(r._count._all)}</td>
                    <td>{usd(r._sum.costMicroUsd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
