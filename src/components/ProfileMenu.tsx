"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import type { Locale } from "@/i18n/config";

// The header avatar opens a small dropdown holding the profile link and the
// log-out button — logout used to sit exposed in the header, now it's tucked
// under the profile menu like most apps.
export function ProfileMenu({
  locale,
  forumName,
  profileLabel,
  logoutLabel,
}: {
  locale: Locale;
  forumName: string;
  profileLabel: string;
  logoutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on Escape and on click outside the menu.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="profile-wrap" ref={wrapRef}>
      <button
        type="button"
        className="header-profile"
        title={forumName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="header-avatar" aria-hidden="true">
          {forumName.charAt(0).toUpperCase()}
        </span>
        <span className="header-profile-name">{forumName}</span>
        <span className="profile-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <Link
            href={`/${locale}/u/${forumName}`}
            role="menuitem"
            className="profile-menu-item"
            onClick={() => setOpen(false)}
          >
            {profileLabel}
          </Link>
          <form action={logout}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" role="menuitem" className="profile-menu-item profile-menu-logout">
              {logoutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
