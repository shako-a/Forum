"use client";

import { useActionState, useState } from "react";
import { updateAiPackage } from "@/app/actions/admin-ai";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminAiPackage = {
  id: string;
  key: string;
  nameEn: string;
  nameKa: string;
  tier: string | null;
  isActive: boolean;
  monthlyBudgetMicroUsd: number;
  rolloverPercent: number;
  /** How many users currently resolve to this package. */
  holders: number;
};

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

const usd = (micro: number) => "$" + (micro / 1_000_000).toFixed(2);
const dollars = (micro: number) => (micro / 1_000_000).toString();

function PackageCard({ pkg, dict, locale }: { pkg: AdminAiPackage; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.ai;
  const [state, action, pending] = useActionState(updateAiPackage, undefined);

  // Controlled so the derived figures below update as the admin types.
  const [monthly, setMonthly] = useState(dollars(pkg.monthlyBudgetMicroUsd));
  const [rollover, setRollover] = useState(String(pkg.rolloverPercent));
  const [active, setActive] = useState(pkg.isActive);
  const [tier, setTier] = useState(pkg.tier ?? "");

  const budget = parseFloat(monthly) || 0;
  const roll = parseInt(rollover, 10) || 0;
  // Days in the *current* month, since the allowance is spread over the real
  // calendar month rather than a nominal 30 days.
  const daysThisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();
  const perDay = budget / daysThisMonth;
  const maxCarry = (budget * roll) / 100;
  // The true worst case: a full month's accrual on top of the largest carry-in.
  const peakMonth = budget + maxCarry;

  return (
    <div className={`card card-pad ai-pkg${active ? "" : " row-off"}`}>
      <form action={action} className="admin-form">
        <input type="hidden" name="id" value={pkg.id} />

        <div className="ai-pkg-head">
          <h3 className="admin-h2">{locale === "ka" ? pkg.nameKa : pkg.nameEn}</h3>
          <code className="muted-sm">{pkg.key}</code>
          <span className="pill">{pkg.holders} {t.holders}</span>
        </div>

        <div className="field-row">
          <label className="field">
            <span>{t.nameEn}</span>
            <input name="nameEn" className="input" defaultValue={pkg.nameEn} required />
            <FieldError msgs={state?.errors?.nameEn} />
          </label>
          <label className="field">
            <span>{t.nameKa}</span>
            <input name="nameKa" className="input" defaultValue={pkg.nameKa} required />
            <FieldError msgs={state?.errors?.nameKa} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>{t.tier}</span>
            <select
              name="tier"
              className="input"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              {/* Empty = granted to nobody; how AI-User ships. */}
              <option value="">{t.tierNone}</option>
              <option value="SUPPORTER">{t.tierSupporter}</option>
              <option value="DONOR">{t.tierDonor}</option>
              <option value="PRO">{t.tierPro}</option>
            </select>
            <span className="field-hint">{t.tierHint}</span>
          </label>

          <label className="field">
            <span>{t.monthlyBudget}</span>
            <input
              name="monthlyBudgetMicroUsd"
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              required
            />
            <span className="field-hint">{t.monthlyBudgetHint}</span>
            <FieldError msgs={state?.errors?.monthlyBudgetMicroUsd} />
          </label>

          <label className="field">
            <span>{t.rollover}</span>
            <input
              name="rolloverPercent"
              type="number"
              min="0"
              max="100"
              className="input"
              value={rollover}
              onChange={(e) => setRollover(e.target.value)}
              required
            />
            <span className="field-hint">{t.rolloverHint}</span>
            <FieldError msgs={state?.errors?.rolloverPercent} />
          </label>
        </div>

        {/* Derived, so the cost consequence of a number is visible before saving. */}
        {/* Derived, so the cost consequence of a number is visible before
            saving — including the peak, which is higher than the monthly
            figure because carry-over stacks on a full month's accrual. */}
        <div className="ai-derived">
          <span>
            <strong>${perDay.toFixed(3)}</strong> {t.derivedPerDay}
          </span>
          <span>
            <strong>${maxCarry.toFixed(2)}</strong> {t.derivedMaxCarry}
          </span>
          <span>
            <strong>${peakMonth.toFixed(2)}</strong> {t.derivedPeak}
          </span>
        </div>

        <label className="admin-check">
          <input
            type="checkbox"
            name="isActive"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t.active}
        </label>

        {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
        {state?.ok && <p className="auth-ok">{state.message}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {dict.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AiPackageAdmin({
  packages,
  dict,
  locale,
}: {
  packages: AdminAiPackage[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.admin.ai;
  return (
    <>
      <p className="muted-sm" style={{ marginBottom: 14 }}>{t.packagesIntro}</p>
      <div className="ai-pkg-grid">
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} dict={dict} locale={locale} />
        ))}
      </div>
    </>
  );
}
