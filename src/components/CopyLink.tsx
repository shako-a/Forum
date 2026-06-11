"use client";

import { useState } from "react";

// Copies the current page URL (optionally with a #anchor) to the clipboard.
export function CopyLink({
  anchor,
  label,
  copiedLabel,
}: {
  anchor?: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = anchor
      ? `${window.location.origin}${window.location.pathname}#${anchor}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — no-op.
    }
  }

  return (
    <button type="button" className="action" onClick={copy}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
        <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
}
