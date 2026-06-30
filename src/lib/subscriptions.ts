import { db } from "@/lib/db";

export type Tier = "DONOR" | "PRO";

// Monthly price each tier pays, in USD cents. PLACEHOLDERS — change here when
// pricing is finalized; this drives the "Paid" column and Usage %.
export const TIER_PRICE_CENTS: Record<Tier, number> = {
  DONOR: 500, // $5/mo
  PRO: 2000, // $20/mo
};

export function tierPriceCents(tier: string): number {
  return TIER_PRICE_CENTS[tier as Tier] ?? 0;
}

/**
 * Keep the Subscription ledger in sync with a tier toggle. Idempotent:
 *  - turning a tier ON with no active row → creates one
 *  - turning a tier OFF with an active row → marks it CANCELED (kept as history)
 * Re-activating later creates a fresh row, preserving the canceled one.
 */
export async function syncSubscription(userId: string, tier: Tier, active: boolean): Promise<void> {
  const existing = await db.subscription.findFirst({
    where: { userId, tier, status: "ACTIVE" },
    select: { id: true },
  });
  if (active && !existing) {
    await db.subscription.create({
      data: { userId, tier, status: "ACTIVE", priceCents: TIER_PRICE_CENTS[tier] },
    });
  } else if (!active && existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: { status: "CANCELED", endedAt: new Date() },
    });
  }
}

/**
 * Start of the current monthly billing period: the latest monthly anniversary
 * of `startedAt` that is on or before `asOf`. No cron needed — derived on read.
 */
export function billingPeriodStart(startedAt: Date, asOf: Date): Date {
  const start = new Date(startedAt);
  let months = (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth());
  const candidate = new Date(start);
  candidate.setMonth(start.getMonth() + months);
  if (candidate > asOf) {
    months -= 1;
    candidate.setTime(new Date(start).setMonth(start.getMonth() + months));
  }
  return candidate;
}
