"use client";

import { useEffect, useState, type ReactNode } from "react";

// Hamburger button + sliding drawer for the left nav on narrow screens (the
// drawer content is the same sidebar nav, passed as children). Closes on
// backdrop tap, Escape, or any click inside (so following a link closes it).
export function MobileSidebar({ label, children }: { label: string; children: ReactNode }) {
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
      <button
        type="button"
        className="menu-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}

      <div className={`drawer${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        {children}
      </div>
    </>
  );
}
