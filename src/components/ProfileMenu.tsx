"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logout } from "@/app/actions/auth";
import { setActingAs } from "@/app/actions/acting-as";
import type { Locale } from "@/i18n/config";

type Biz = { id: string; name: string; slug: string };

// The header identity control. Shows who you're acting as (yourself or a
// business you manage), lets you switch, and holds the profile link + logout.
export function ProfileMenu({
  locale,
  forumName,
  profileLabel,
  logoutLabel,
  businesses,
  actingId,
  actingName,
  actingAsLabel,
  selfLabel,
  myListingsLabel,
}: {
  locale: Locale;
  forumName: string;
  profileLabel: string;
  logoutLabel: string;
  businesses: Biz[];
  actingId: string | null;
  actingName: string | null;
  actingAsLabel: string;
  selfLabel: string;
  myListingsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  function switchTo(id: string | null) {
    setOpen(false);
    startTransition(async () => {
      await setActingAs(id);
      router.refresh();
    });
  }

  const displayName = actingName ?? forumName;

  return (
    <div className="profile-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`header-profile${actingName ? " header-profile-biz" : ""}`}
        title={displayName}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="header-avatar" aria-hidden="true">
          {actingName ? "🏢" : forumName.charAt(0).toUpperCase()}
        </span>
        <span className="header-profile-name">{displayName}</span>
        <span className="profile-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          {businesses.length > 0 && (
            <>
              <div className="profile-menu-label">{actingAsLabel}</div>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!actingId}
                className={`profile-menu-item${!actingId ? " active" : ""}`}
                onClick={() => switchTo(null)}
              >
                {selfLabel}
                {!actingId && <span className="profile-menu-check">✓</span>}
              </button>
              {businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={actingId === b.id}
                  className={`profile-menu-item${actingId === b.id ? " active" : ""}`}
                  onClick={() => switchTo(b.id)}
                >
                  🏢 {b.name}
                  {actingId === b.id && <span className="profile-menu-check">✓</span>}
                </button>
              ))}
              <div className="profile-menu-sep" />
            </>
          )}
          <Link
            href={actingId ? `/${locale}/business/${businesses.find((b) => b.id === actingId)?.slug ?? ""}` : `/${locale}/u/${forumName}`}
            role="menuitem"
            className="profile-menu-item"
            onClick={() => setOpen(false)}
          >
            {profileLabel}
          </Link>
          <Link
            href={`/${locale}/account/listings`}
            role="menuitem"
            className="profile-menu-item"
            onClick={() => setOpen(false)}
          >
            📋 {myListingsLabel}
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
