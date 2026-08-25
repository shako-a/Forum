"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// The header's right-hand controls (Ask AI, theme, language, admin, inbox,
// create, profile / log in) don't fit a phone header. Rather than hiding them
// — which previously left theme, language and log-in unreachable on mobile —
// they move into a drawer that slides in from the right.
//
// The drawer is portalled to <body>: the header sets `backdrop-filter`, which
// makes it a containing block for fixed-position descendants, so a drawer
// rendered inside it would be clipped to the header's own height.
//
// On wide screens the panel is `display: contents`, so the children lay out
// exactly as they did before and this component is invisible to the layout.
export function HeaderActions({
  menuLabel,
  closeLabel,
  children,
}: {
  menuLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  // Which side of the breakpoint we're on decides whether the controls are
  // portalled into the drawer or left inline in the header.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 840px)");
    const sync = () => {
      setMobile(mq.matches);
      if (!mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  // Tapping anything inside closes the drawer, so following a link or
  // toggling the theme doesn't leave it hanging open.
  const panel = (
    <div className={`header-drawer${open ? " open" : ""}`} onClick={() => setOpen(false)}>
      <button type="button" className="filter-close" aria-label={closeLabel} onClick={() => setOpen(false)}>
        ✕
      </button>
      {children}
    </div>
  );

  return (
    <div className="header-actions">
      <button
        type="button"
        className="header-more-btn"
        aria-label={menuLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {mobile
        ? createPortal(
            <>
              {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
              {panel}
            </>,
            document.body,
          )
        : panel}
    </div>
  );
}
