"use client";

import { useEffect, useState, type ReactNode } from "react";

// The listing directories keep their filters in a right-hand column on wide
// screens. On a phone that column would push the results a screenful down, so
// the same panel becomes a drawer that slides in from the right, opened by a
// floating button that stays reachable while scrolling results.
//
// Desktop and mobile render identical markup — CSS decides which behaviour
// applies, so nothing is duplicated and the filters work with JS disabled on
// desktop.
export function FilterDrawer({
  label,
  closeLabel,
  children,
}: {
  label: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className="filter-fab" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M7 12h10M11 18h2" />
        </svg>
        {label}
      </button>

      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`mk-filter-col${open ? " open" : ""}`}>
        <button type="button" className="filter-close" aria-label={closeLabel} onClick={() => setOpen(false)}>
          ✕
        </button>
        {children}
      </aside>
    </>
  );
}
