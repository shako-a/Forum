"use client";

import { useState, useTransition } from "react";
import { setOpenToGuests } from "@/app/actions/admin-settings";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Admin → More: open the whole forum to unregistered visitors. Locked topics
 * stay locked in their own settings — this switch only says whether guests are
 * let past them, so turning it off puts every lock straight back.
 */
export function OpenHouseToggle({ enabled, lockedCount, dict }: { enabled: boolean; lockedCount: number; dict: Dictionary }) {
  const t = dict.admin;
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  function change(next: boolean) {
    setOn(next);
    start(() => void setOpenToGuests(next));
  }

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">👁 {t.openHouse}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.openHouseSub}</p>
      <label className="admin-check">
        <input type="checkbox" checked={on} disabled={pending} onChange={(e) => change(e.target.checked)} />
        <span>{t.openHouseLabel}</span>
      </label>
      <p className="account-sub" style={{ marginBottom: 0 }}>
        {(on ? t.openHouseOn : t.openHouseOff).replace("{n}", String(lockedCount))}
      </p>
    </div>
  );
}
