import { getBucket, formatDuration, accrualRate } from "@/lib/ai-credits";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

/**
 * The user-facing view of an AI allowance.
 *
 * Deliberately minimal: a usage percentage and when more credits arrive.
 * Users get no credit counts, costs or package internals — those are the
 * admin's business, and exposing them invites gaming the numbers.
 *
 * Note there is no "resets on the 1st" date to show: credits accrue
 * continuously (token bucket), so the honest equivalent of a reset time is
 * how long until the balance is useful again.
 */
export async function AiAllowance({
  user,
  dict,
  locale,
}: {
  user: { id: string; isPro: boolean; isDonor: boolean; isSupporter: boolean };
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.admin.ai;
  const bucket = await getBucket(user);
  if (!bucket.enabled) return null;

  const usedPct = Math.min(100, Math.max(0, Math.round(bucket.spentPct)));
  const empty = bucket.balance <= 0;
  const full = bucket.msUntilFull <= 0;

  // When the allowance is exhausted, the useful number is how long until
  // enough has been released to ask again — not when it would be full, which
  // could be weeks away.
  const ENOUGH_MICRO_USD = 20_000; // ≈ one Ask AI question
  const rate = bucket.pkg ? accrualRate(bucket.pkg, new Date()) : 0;
  const msToUsable =
    empty && rate > 0 ? (ENOUGH_MICRO_USD - bucket.balance) / rate : bucket.msUntilFull;

  return (
    <div className={`ai-allowance${empty ? " out" : ""}`}>
      <div className="ai-allowance-head">
        <span className="ai-allowance-label">{t.yourUsage}</span>
        <span className="ai-allowance-pct">{usedPct}%</span>
      </div>
      <div
        className="ai-allowance-bar"
        role="progressbar"
        aria-valuenow={usedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.yourUsage}
      >
        <span style={{ width: `${usedPct}%` }} />
      </div>
      <p className="ai-allowance-note">
        {empty
          ? `${t.outOfCredits} ${t.refillSome.replace("{time}", formatDuration(msToUsable, locale))}`
          : full
            ? t.usedPct.replace("{pct}", String(usedPct))
            : t.refillFull.replace("{time}", formatDuration(bucket.msUntilFull, locale))}
      </p>
    </div>
  );
}
