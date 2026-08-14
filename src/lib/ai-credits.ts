import "server-only";
import { db } from "@/lib/db";

// AI allowances.
//
// Model, in the admin's words: each package has a monthly amount; that amount
// is released gradually across the calendar month rather than all at once; and
// a share of whatever is left over carries into the next month.
//
// Spreading is what stops someone burning a month's budget on day two — on any
// given day you hold at most what has accrued so far plus what you carried in.
// Rollover is what stops a light month feeling confiscated.
//
// Everything is in micro-USD (USD × 1_000_000), the same unit AiUsage already
// records, so an allowance bounds real spend rather than a call count — a long
// question costs far more than a short one.
//
// There is deliberately no cron. The stored balance is only valid as of
// `lastRefillAt`; accrual, month rollovers and rollover-carry are all derived
// on read (the same approach that makes discounts expire on their own in
// lib/packages.ts). Nothing drifts because a scheduled job failed to fire.

export type AiPackageRow = {
  key: string;
  nameEn: string;
  nameKa: string;
  tier: string | null;
  isActive: boolean;
  monthlyBudgetMicroUsd: number;
  rolloverPercent: number;
};

export type BucketState = {
  pkg: AiPackageRow | null;
  /** Spendable right now, micro-USD. */
  balance: number;
  /** Highest balance this package can ever hold (a full month + max carry). */
  ceiling: number;
  /** Spent so far this calendar month. */
  spent: number;
  /** Carried in from last month. */
  carriedIn: number;
  /** spent / monthly budget, as a percentage. */
  spentPct: number;
  /** balance / ceiling, as a percentage. */
  allocatedPct: number;
  /** ms until the balance reaches its ceiling (0 if already there). */
  msUntilFull: number;
  /** Start of the next calendar month — when rollover happens. */
  periodEndsAt: Date;
  /** False when the tier gets no AI at all. */
  enabled: boolean;
};

// Month boundaries in UTC so accrual is deterministic regardless of server TZ.
function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function nextMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
/** Actual length of the month containing `d` — 28, 29, 30 or 31 days. */
export function monthLengthMs(d: Date): number {
  return nextMonthStart(d).getTime() - monthStart(d).getTime();
}

/** Micro-USD accrued per millisecond during the month containing `at`. */
export function accrualRate(pkg: AiPackageRow, at: Date): number {
  return pkg.monthlyBudgetMicroUsd / monthLengthMs(at);
}

/**
 * The most a balance can reach: a full month's accrual plus the largest
 * carry-in the rollover rule allows. Also the worst-case spend in one month.
 */
export function ceilingFor(pkg: AiPackageRow): number {
  return pkg.monthlyBudgetMicroUsd * (1 + Math.max(0, pkg.rolloverPercent) / 100);
}

export function maxCarryFor(pkg: AiPackageRow): number {
  return (pkg.monthlyBudgetMicroUsd * Math.max(0, pkg.rolloverPercent)) / 100;
}

/** A user who has no AI package at all. */
export function resolvePackage(
  user: { isPro: boolean; isDonor: boolean; isSupporter: boolean },
  packages: AiPackageRow[],
): AiPackageRow | null {
  const byTier = (tier: string) => packages.find((p) => p.tier === tier && p.isActive) ?? null;
  // Highest tier wins, so upgrading never reduces an allowance.
  if (user.isPro) {
    const p = byTier("PRO");
    if (p) return p;
  }
  if (user.isDonor) {
    const p = byTier("DONOR");
    if (p) return p;
  }
  if (user.isSupporter) {
    const p = byTier("SUPPORTER");
    if (p) return p;
  }
  return null;
}

type Stored = {
  balanceMicroUsd: number;
  lastRefillAt: Date;
  packageKey: string | null;
  spentThisPeriodMicroUsd: number;
  carriedInMicroUsd: number;
  periodStartedAt: Date;
};

type Projected = {
  balance: number;
  spent: number;
  carriedIn: number;
  periodStart: Date;
};

// Someone away for years shouldn't cost us an unbounded loop; rollover
// converges long before this anyway.
const MAX_MONTHS = 36;

/**
 * Bring a stored row up to `now`: accrue, then apply a rollover at each
 * calendar-month boundary crossed. Pure, so it is unit-testable and shared by
 * the read and write paths.
 */
export function project(stored: Stored, pkg: AiPackageRow, now: Date): Projected {
  const ceiling = ceilingFor(pkg);

  // A tier change re-clamps rather than letting an old, larger balance persist.
  let balance = stored.packageKey === pkg.key ? stored.balanceMicroUsd : Math.min(stored.balanceMicroUsd, ceiling);
  let periodStart = monthStart(stored.periodStartedAt);
  let spent = stored.spentThisPeriodMicroUsd;
  let carriedIn = stored.carriedInMicroUsd;
  let cursor = stored.lastRefillAt;

  for (let i = 0; i < MAX_MONTHS; i++) {
    const boundary = nextMonthStart(periodStart);
    if (now < boundary) break;

    // Accrue to the end of this month, then carry a share of what's unused.
    balance = Math.min(
      ceiling,
      balance + Math.max(0, boundary.getTime() - cursor.getTime()) * accrualRate(pkg, periodStart),
    );
    carriedIn = Math.min(maxCarryFor(pkg), Math.max(0, balance) * (Math.max(0, pkg.rolloverPercent) / 100));
    balance = carriedIn;
    spent = 0;
    cursor = boundary;
    periodStart = boundary;
  }

  // Partial accrual through the current month.
  balance = Math.min(
    ceiling,
    balance + Math.max(0, now.getTime() - cursor.getTime()) * accrualRate(pkg, periodStart),
  );

  return { balance, spent, carriedIn, periodStart };
}

function stateFrom(pkg: AiPackageRow | null, p: Projected): BucketState {
  const periodEndsAt = nextMonthStart(p.periodStart);
  if (!pkg || !pkg.isActive || pkg.monthlyBudgetMicroUsd <= 0) {
    return {
      pkg,
      balance: 0,
      ceiling: 0,
      spent: p.spent,
      carriedIn: 0,
      spentPct: 0,
      allocatedPct: 0,
      msUntilFull: 0,
      periodEndsAt,
      enabled: false,
    };
  }
  const ceiling = ceilingFor(pkg);
  const rate = accrualRate(pkg, p.periodStart);
  return {
    pkg,
    balance: p.balance,
    ceiling,
    spent: p.spent,
    carriedIn: p.carriedIn,
    spentPct: (p.spent / pkg.monthlyBudgetMicroUsd) * 100,
    allocatedPct: ceiling > 0 ? (p.balance / ceiling) * 100 : 0,
    msUntilFull: rate > 0 ? Math.max(0, ceiling - p.balance) / rate : 0,
    periodEndsAt,
    enabled: true,
  };
}

export async function getPackages(): Promise<AiPackageRow[]> {
  return db.aiPackage.findMany({ orderBy: { sortOrder: "asc" } });
}

function freshRow(pkg: AiPackageRow, now: Date): Stored {
  // New subscribers start with the month's accrual already under way rather
  // than at zero, so the feature is usable the moment they pay.
  return {
    balanceMicroUsd: maxCarryFor(pkg),
    lastRefillAt: now,
    packageKey: pkg.key,
    spentThisPeriodMicroUsd: 0,
    carriedInMicroUsd: maxCarryFor(pkg),
    periodStartedAt: now,
  };
}

/** Live bucket for a user. Read-only — safe from render paths. */
export async function getBucket(
  user: { id: string; isPro: boolean; isDonor: boolean; isSupporter: boolean },
  packages?: AiPackageRow[],
): Promise<BucketState> {
  const pkgs = packages ?? (await getPackages());
  const pkg = resolvePackage(user, pkgs);
  const now = new Date();
  const row = await db.aiBalance.findUnique({ where: { userId: user.id } });

  if (!pkg) {
    return stateFrom(null, {
      balance: 0,
      spent: row?.spentThisPeriodMicroUsd ?? 0,
      carriedIn: 0,
      periodStart: monthStart(row?.periodStartedAt ?? now),
    });
  }
  return stateFrom(pkg, project(row ?? freshRow(pkg, now), pkg, now));
}

export type SpendCheck =
  | { ok: true; pkg: AiPackageRow }
  | { ok: false; reason: "disabled" | "empty"; state: BucketState };

/**
 * Gate a call before it runs. The real cost isn't known until the call
 * returns, so this only requires a positive balance; `chargeCredits` deducts
 * the actual cost afterwards. Worst case a user finishes one call slightly in
 * arrears — bounded by max_tokens, and far simpler than pre-authorising.
 */
export async function checkCredits(user: {
  id: string;
  isPro: boolean;
  isDonor: boolean;
  isSupporter: boolean;
}): Promise<SpendCheck> {
  const state = await getBucket(user);
  if (!state.enabled || !state.pkg) return { ok: false, reason: "disabled", state };
  if (state.balance <= 0) return { ok: false, reason: "empty", state };
  return { ok: true, pkg: state.pkg };
}

/**
 * Deduct a completed call's real cost. Never throws: the answer has already
 * been produced and paid for, so a bookkeeping failure must not surface as a
 * user-facing error.
 */
export async function chargeCredits(
  user: { id: string; isPro: boolean; isDonor: boolean; isSupporter: boolean },
  costMicroUsd: number,
): Promise<void> {
  try {
    const pkg = resolvePackage(user, await getPackages());
    if (!pkg || !pkg.isActive) return;

    const now = new Date();
    const row = await db.aiBalance.findUnique({ where: { userId: user.id } });
    const p = project(row ?? freshRow(pkg, now), pkg, now);

    const data = {
      balanceMicroUsd: p.balance - costMicroUsd,
      lastRefillAt: now,
      packageKey: pkg.key,
      spentThisPeriodMicroUsd: p.spent + costMicroUsd,
      carriedInMicroUsd: p.carriedIn,
      periodStartedAt: p.periodStart,
    };
    await db.aiBalance.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  } catch (err) {
    console.error("AI credit charge failed:", err);
  }
}

/** "2h 15m" / "3d" — for the user-facing refill hint. */
export function formatDuration(ms: number, locale: string): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const isKa = locale === "ka";
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return isKa ? `${d} დღე` : `${d}d`;
  }
  if (h > 0) return isKa ? `${h} სთ ${m} წთ` : `${h}h ${m}m`;
  return isKa ? `${m} წთ` : `${m}m`;
}

// --- seeding ---------------------------------------------------------------
// Named after the subscription each is obtained through.
const SEED: AiPackageRow[] = [
  {
    key: "AI_USER",
    nameEn: "AI-User",
    nameKa: "AI-მომხმარებელი",
    // Placeholder: mapped to no tier and switched off. Point it at SUPPORTER
    // and activate to hand Supporters a (temporary) allowance later.
    tier: null,
    isActive: false,
    monthlyBudgetMicroUsd: 500_000, // $0.50
    rolloverPercent: 50,
  },
  {
    key: "AI_DONOR",
    nameEn: "AI-Donor",
    nameKa: "AI-დონორი",
    tier: "DONOR",
    isActive: true,
    monthlyBudgetMicroUsd: 10_000_000, // $10, on a $25/mo subscription
    rolloverPercent: 50,
  },
  {
    key: "AI_PRO",
    nameEn: "AI-Pro",
    nameKa: "AI-პრო",
    tier: "PRO",
    isActive: true,
    monthlyBudgetMicroUsd: 30_000_000, // $30, on a $79/mo subscription
    rolloverPercent: 50,
  },
];

export async function seedAiPackages(): Promise<void> {
  for (const [i, p] of SEED.entries()) {
    await db.aiPackage.upsert({
      where: { key: p.key },
      update: {}, // never clobber admin-tuned values
      create: { ...p, sortOrder: i },
    });
  }
}

export async function aiPackagesNeedSeeding(): Promise<boolean> {
  return (await db.aiPackage.count()) === 0;
}
