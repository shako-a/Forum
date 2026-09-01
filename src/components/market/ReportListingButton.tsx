"use client";

import Link from "@/components/Link";
import { useActionState, useState } from "react";
import { reportMarketListing } from "@/app/actions/market";
import { MARKET_REPORT_REASONS } from "@/lib/market";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// "Report this listing" — a small inline form with marketplace-specific
// reasons. Guests get a login link instead.
export function ReportListingButton({
  locale,
  dict,
  listingId,
  loggedIn,
  loginHref,
}: {
  locale: Locale;
  dict: Dictionary;
  listingId: string;
  loggedIn: boolean;
  loginHref: string;
}) {
  const t = dict.market;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportMarketListing, undefined);

  if (!loggedIn) {
    return (
      <Link href={loginHref} className="action mk-report-link">
        ⚑ {t.report}
      </Link>
    );
  }
  if (state?.ok) {
    return <span className="muted-sm mk-report-done">✓ {t.reportThanks}</span>;
  }

  return (
    <div className="mk-report">
      <button type="button" className="action mk-report-link" onClick={() => setOpen((v) => !v)}>
        ⚑ {t.report}
      </button>
      {open && (
        <form action={action} className="mk-report-form">
          <input type="hidden" name="listingId" value={listingId} />
          <strong>{t.reportTitle}</strong>
          <select name="reason" className="input" defaultValue="" aria-invalid={state?.errors?.reason ? true : undefined}>
            <option value="" disabled>{t.reportReason}</option>
            {MARKET_REPORT_REASONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.icon} {locale === "ka" ? r.ka : r.en}
              </option>
            ))}
          </select>
          {state?.errors?.reason && <span className="field-error">{state.errors.reason.join(" ")}</span>}
          <textarea name="details" className="input" rows={3} placeholder={t.reportDetailsPlaceholder} maxLength={500} />
          {state?.message && !state.ok && <span className="field-error">{state.message}</span>}
          <div className="mk-report-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              {dict.common.cancel}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {t.reportSubmit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
