"use client";

import { useState } from "react";
import { DETAILS_MAX, type DetailRow } from "@/lib/business-social";

// Free-form "Label — value" rows for the storefront details table. Each row is
// a pair of same-named inputs, so the action reads them back as two parallel
// lists in DOM order.
export function DetailsField({
  initial,
  labels,
}: {
  initial: DetailRow[];
  labels: { label: string; value: string; add: string; remove: string };
}) {
  const [rows, setRows] = useState<DetailRow[]>(initial);
  const update = (i: number, patch: Partial<DetailRow>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div className="details-rows">
      {rows.map((r, i) => (
        <div key={i} className="details-row">
          <input className="input" name="detailLabel" value={r.label} maxLength={60} placeholder={labels.label} onChange={(e) => update(i, { label: e.target.value })} />
          <input className="input" name="detailValue" value={r.value} maxLength={60} placeholder={labels.value} onChange={(e) => update(i, { value: e.target.value })} />
          <button type="button" className="action" title={labels.remove} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={rows.length >= DETAILS_MAX}
          onClick={() => setRows((x) => [...x, { label: "", value: "" }])}
        >
          ＋ {labels.add}
        </button>
      </div>
    </div>
  );
}
