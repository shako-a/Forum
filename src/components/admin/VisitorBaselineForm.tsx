"use client";

import { useState, useTransition } from "react";
import { setVisitorBaseline } from "@/app/actions/admin-settings";
import type { Dictionary } from "@/i18n/dictionaries";

// The public "visits" figure is what this forum's own counter has recorded
// plus a baseline carried over from Google Analytics (the counter only
// started collecting when it shipped). Editable here so the carried-over
// number can be corrected without a deploy.
export function VisitorBaselineForm({
  dict,
  baseline,
  recorded,
}: {
  dict: Dictionary;
  baseline: number;
  recorded: number;
}) {
  const t = dict.admin;
  const [value, setValue] = useState(String(baseline));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">🌍 {t.visitsBaseline}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.visitsBaselineSub}</p>
      <div className="admin-baseline-row">
        <label className="field admin-baseline-field">
          <span className="mk-panel-label">{t.visitsBaselineLabel}</span>
          <input
            className="input"
            type="number"
            min={0}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <span className="admin-baseline-sum">
          + {t.visitsRecorded.replace("{n}", String(recorded))} ={" "}
          <strong>{(Number(value) || 0) + recorded}</strong>
        </span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setVisitorBaseline(Number(value) || 0);
              setSaved(true);
            })
          }
        >
          {t.save}
        </button>
        {saved && <span className="muted-sm">✓ {dict.profile.saved}</span>}
      </div>
    </div>
  );
}
