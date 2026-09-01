import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai";
import { billingPeriodStart } from "@/lib/subscriptions";
import {
  getPackages,
  resolvePackage,
  project,
  ceilingFor,
  maxCarryFor,
  seedAiPackages,
  aiPackagesNeedSeeding,
} from "@/lib/ai-credits";
import { AiPackageAdmin, type AdminAiPackage } from "@/components/admin/AiPackageAdmin";
import type { Dictionary } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

const usd = (micro: number) => "$" + (micro / 1_000_000).toFixed(micro >= 1_000_000 ? 2 : 4);
const usdCents = (cents: number) => "$" + (cents / 100).toFixed(2);
const num = (n: number) => n.toLocaleString("en-US");
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminAiUsagePage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/ai-usage">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const t = dict.admin;
  const base = `/${lang}/admin`;

  const sp = await searchParams;
  const tab =
    sp.tab === "per-user" ? "per-user" : sp.tab === "packages" ? "packages" : "overview";

  // First visit creates the three AI packages (AI-User ships switched off).
  if (await aiPackagesNeedSeeding()) await seedAiPackages();

  return (
    <div>
      <h1 className="admin-h1">{t.aiUsage}</h1>
      <p className="muted-sm" style={{ marginBottom: 16 }}>{t.aiUsageSub}</p>

      {!isAiConfigured() && (
        <p className="auth-alert" style={{ marginBottom: 16 }}>⚠ {t.aiNotConfigured}</p>
      )}

      <div className="admin-tabs">
        <Link href={`${base}/ai-usage`} className={`admin-tab${tab === "overview" ? " active" : ""}`}>
          {t.aiTabOverview}
        </Link>
        <Link
          href={`${base}/ai-usage?tab=per-user`}
          className={`admin-tab${tab === "per-user" ? " active" : ""}`}
        >
          {t.aiTabPerUser}
        </Link>
        <Link
          href={`${base}/ai-usage?tab=packages`}
          className={`admin-tab${tab === "packages" ? " active" : ""}`}
        >
          {t.ai.tabPackages}
        </Link>
      </div>

      {tab === "overview" ? (
        <Overview t={t} />
      ) : tab === "packages" ? (
        <Packages dict={dict} lang={lang} />
      ) : (
        <PerUser t={t} lang={lang} />
      )}
    </div>
  );
}

async function Overview({ t }: { t: Dictionary["admin"] }) {
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
    <>
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
    </>
  );
}

async function PerUser({ t, lang }: { t: Dictionary["admin"]; lang: string }) {
  const now = new Date();

  // Every subscription (active + canceled) with its user.
  const subs = await db.subscription.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    take: 500,
    include: { user: { select: { id: true, forumName: true } } },
  });

  if (subs.length === 0) {
    return <div className="card card-pad muted-sm">{t.aiNoSubs}</div>;
  }

  // Pull usage for the involved users once; bucket per row's billing window in JS.
  const userIds = [...new Set(subs.map((s) => s.userId))];
  const usage = await db.aiUsage.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, costMicroUsd: true, createdAt: true },
  });

  const tierLabel = (tier: string) => (tier === "PRO" ? t.aiTierPro : t.aiTierDonor);

  // Live bucket per user: allocation, balance and rolling spend. Read-only —
  // accrual is projected here, not written.
  const aiPackages = await getPackages();
  const [balanceRows, tierUsers] = await Promise.all([
    db.aiBalance.findMany({ where: { userId: { in: userIds } } }),
    db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, isPro: true, isDonor: true, isSupporter: true },
    }),
  ]);
  const balanceOf = new Map(balanceRows.map((b) => [b.userId, b]));
  const flagsOf = new Map(tierUsers.map((u) => [u.id, u]));

  function bucketFor(userId: string) {
    const flags = flagsOf.get(userId);
    if (!flags) return null;
    const pkg = resolvePackage(flags, aiPackages);
    if (!pkg) return null;
    const stored = balanceOf.get(userId) ?? {
      balanceMicroUsd: maxCarryFor(pkg),
      lastRefillAt: now,
      packageKey: pkg.key,
      spentThisPeriodMicroUsd: 0,
      carriedInMicroUsd: maxCarryFor(pkg),
      periodStartedAt: now,
    };
    const p = project(stored, pkg, now);
    const ceiling = ceilingFor(pkg);
    return {
      allocation: pkg.monthlyBudgetMicroUsd,
      balance: p.balance,
      allocatedPct: ceiling > 0 ? (p.balance / ceiling) * 100 : 0,
      spent: p.spent,
      spentPct:
        pkg.monthlyBudgetMicroUsd > 0 ? (p.spent / pkg.monthlyBudgetMicroUsd) * 100 : 0,
    };
  }

  const rows = subs.map((sub) => {
    const active = sub.status === "ACTIVE";
    // Active → current billing period to now. Canceled → its final period.
    const windowEnd = active ? now : (sub.endedAt ?? now);
    const windowStart = billingPeriodStart(sub.startedAt, windowEnd);
    const spentMicro = usage.reduce(
      (sum, u) =>
        u.userId === sub.userId && u.createdAt >= windowStart && u.createdAt <= windowEnd
          ? sum + u.costMicroUsd
          : sum,
      0,
    );
    const paidUsd = sub.priceCents / 100;
    const pct = paidUsd > 0 ? (spentMicro / 1_000_000 / paidUsd) * 100 : 0;
    return { s: sub, active, spentMicro, pct };
  });

  return (
    <div className="card card-pad">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.aiUser}</th>
            <th>{t.aiSubType}</th>
            <th>{t.aiPeriod}</th>
            <th>{t.aiPaid}</th>
            <th>{t.aiSpent}</th>
            <th>{t.aiUsagePct}</th>
            <th>{t.ai.colAllocation}</th>
            <th>{t.ai.colBalance}</th>
            <th>{t.ai.colAllocatedPct}</th>
            <th>{t.ai.colCreditSpend}</th>
            <th>{t.ai.colSpendPct}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, active, spentMicro, pct }) => (
            <tr key={s.id} className={active ? undefined : "row-muted"}>
              <td>
                <Link href={`/${lang}/admin/users/${s.userId}`} className="admin-link">
                  {s.user.forumName}
                </Link>
              </td>
              <td>
                {tierLabel(s.tier)}
                {!active && <span className="sub-badge"> · {t.aiStatusCanceled}</span>}
              </td>
              <td className="muted-sm">
                {ymd(s.startedAt)} — {s.endedAt ? ymd(s.endedAt) : t.aiStatusActive}
              </td>
              <td>{usdCents(s.priceCents)}</td>
              <td>{usd(spentMicro)}</td>
              <td className={pct > 100 ? "usage-over" : undefined}>{pct.toFixed(0)}%</td>
              {(() => {
                const bkt = bucketFor(s.userId);
                if (!bkt) {
                  return (
                    <td colSpan={5} className="muted-sm">
                      {t.ai.noPackage}
                    </td>
                  );
                }
                return (
                  <>
                    <td>{usd(bkt.allocation)}</td>
                    <td>{usd(Math.max(0, bkt.balance))}</td>
                    <td>{bkt.allocatedPct.toFixed(0)}%</td>
                    <td>{usd(bkt.spent)}</td>
                    <td className={bkt.spentPct > 100 ? "usage-over" : undefined}>
                      {bkt.spentPct.toFixed(0)}%
                    </td>
                  </>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Packages({ dict, lang }: { dict: Dictionary; lang: "en" | "ka" }) {
  const rows = await db.aiPackage.findMany({ orderBy: { sortOrder: "asc" } });

  // Holder counts come from the tier each package is mapped to, since that is
  // what resolvePackage actually keys on.
  const [pro, donor, supporter] = await Promise.all([
    db.user.count({ where: { isPro: true } }),
    db.user.count({ where: { isDonor: true, isPro: false } }),
    db.user.count({ where: { isSupporter: true, isDonor: false, isPro: false } }),
  ]);
  const holdersFor = (tier: string | null) =>
    tier === "PRO" ? pro : tier === "DONOR" ? donor : tier === "SUPPORTER" ? supporter : 0;

  const packages: AdminAiPackage[] = rows.map((r) => ({
    id: r.id,
    key: r.key,
    nameEn: r.nameEn,
    nameKa: r.nameKa,
    tier: r.tier,
    isActive: r.isActive,
    monthlyBudgetMicroUsd: r.monthlyBudgetMicroUsd,
    rolloverPercent: r.rolloverPercent,
    holders: r.isActive ? holdersFor(r.tier) : 0,
  }));

  return <AiPackageAdmin packages={packages} dict={dict} locale={lang} />;
}
