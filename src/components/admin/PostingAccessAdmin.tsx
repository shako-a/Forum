"use client";

import { useState, useTransition } from "react";
import { setPostingAccess } from "@/app/actions/admin-settings";
import type { PostingAccess, PostingArea, PostingMode } from "@/lib/posting-access";
import type { Dictionary } from "@/i18n/dictionaries";

export type PostingAreaRow = {
  area: PostingArea;
  label: string;
  perkKey: string;
  perkName: string;
  packages: string[]; // names of packages that carry the perk
};

// Admin → pricing: who may post in each listing area. "Every member" today;
// switch an area to "perk holders" to make it part of the paid plans.
export function PostingAccessAdmin({
  dict,
  rows,
  access,
}: {
  dict: Dictionary;
  rows: PostingAreaRow[];
  access: PostingAccess;
}) {
  const t = dict.admin;
  const [state, setState] = useState<PostingAccess>(access);
  const [pending, start] = useTransition();

  function change(area: PostingArea, mode: PostingMode) {
    setState((s) => ({ ...s, [area]: mode }));
    start(() => void setPostingAccess(area, mode));
  }

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">🔓 {t.postingAccess}</h2>
      <p className="account-sub" style={{ marginTop: 0 }}>{t.postingAccessSub}</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.postingArea}</th>
            <th>{t.postingWho}</th>
            <th>{t.postingPerk}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.area}>
              <td><strong>{r.label}</strong></td>
              <td>
                <select
                  className="input"
                  value={state[r.area]}
                  disabled={pending}
                  onChange={(e) => change(r.area, e.target.value as PostingMode)}
                >
                  <option value="all">{t.postingAll}</option>
                  <option value="perk">{t.postingPerkHolders}</option>
                </select>
              </td>
              <td className="muted-sm">
                <code>{r.perkKey}</code> · {r.perkName}
                <div>
                  {r.packages.length > 0
                    ? t.postingIncludedIn.replace("{list}", r.packages.join(", "))
                    : t.postingNotInPackages}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
