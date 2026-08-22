"use client";

import { useState } from "react";

// Compact, click-to-copy identifier cell for admin tables. IDs are cuids (long),
// so we show a short prefix and copy the full value to the clipboard on click.
export function IdCell({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard blocked — no-op
    }
  }

  return (
    <button
      type="button"
      className="id-cell"
      onClick={copy}
      title={copied ? "Copied" : `${id} — click to copy`}
    >
      <code>{id.slice(0, 8)}…</code>
      <span className="id-copy" aria-hidden="true">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
