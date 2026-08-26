"use client";

import { useState, useTransition } from "react";
import { setEventAccess } from "@/app/actions/admin-settings";
import { EVENT_MODES, EVENT_PERK_KEY, type EventAccess, type EventMode } from "@/lib/events";
import type { Dictionary } from "@/i18n/dictionaries";

export type EventLabelOption = { id: string; name: string; holders: number };

// Admin → pricing: who may create Events. Verified members today; the tag mode
// is the hook for tying it to an achievement later.
export function EventAccessAdmin({
  dict,
  access,
  labels,
  perkPackages,
  eventCount,
  eligible,
}: {
  dict: Dictionary;
  access: EventAccess;
  labels: EventLabelOption[];
  perkPackages: string[];
  eventCount: number;
  eligible: number;
}) {
  const t = dict.admin.events;
  const [mode, setMode] = useState<EventMode>(access.mode);
  const [labelId, setLabelId] = useState<string>(access.labelId ?? "");
  const [pending, start] = useTransition();

  const modeLabel: Record<EventMode, string> = {
    all: t.modeAll,
    verified: t.modeVerified,
    label: t.modeLabel,
    perk: t.modePerk,
    staff: t.modeStaff,
  };
  const modeHint: Record<EventMode, string> = {
    all: t.hintAll,
    verified: t.hintVerified,
    label: t.hintLabel,
    perk: perkPackages.length ? t.hintPerkIn.replace("{list}", perkPackages.join(", ")) : t.hintPerkNone,
    staff: t.hintStaff,
  };

  function save(nextMode: EventMode, nextLabel: string) {
    setMode(nextMode);
    setLabelId(nextLabel);
    start(() => void setEventAccess(nextMode, nextLabel || null));
  }

  // Choosing the tag mode with no tag selected would lock everyone out, so the
  // first tag is pre-selected instead of saving an empty gate.
  function changeMode(next: EventMode) {
    if (next === "label" && !labelId && labels.length > 0) return save(next, labels[0].id);
    save(next, next === "label" ? labelId : "");
  }

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">🗓 {t.title}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.sub}</p>

      <div className="admin-stats" style={{ marginBottom: 14 }}>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">🗓</span>
          <span className="admin-stat-value">{eventCount}</span>
          <span className="admin-stat-label">{t.statEvents}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-ico" aria-hidden="true">👥</span>
          <span className="admin-stat-value">{eligible}</span>
          <span className="admin-stat-label">{t.statEligible}</span>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.whoCanPost}</th>
            <th>{t.effect}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ minWidth: 200 }}>
              <select
                className="input"
                value={mode}
                disabled={pending}
                onChange={(e) => changeMode(e.target.value as EventMode)}
              >
                {EVENT_MODES.map((m) => (
                  <option key={m} value={m}>{modeLabel[m]}</option>
                ))}
              </select>
              {mode === "label" && (
                <div style={{ marginTop: 8 }}>
                  {labels.length === 0 ? (
                    <span className="field-error">{t.noLabels}</span>
                  ) : (
                    <select
                      className="input"
                      value={labelId}
                      disabled={pending}
                      onChange={(e) => save("label", e.target.value)}
                    >
                      {labels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.holders})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </td>
            <td className="muted-sm">
              {modeHint[mode]}
              {mode === "perk" && <div><code>{EVENT_PERK_KEY}</code></div>}
              <div style={{ marginTop: 6 }}>{t.staffAlways}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
