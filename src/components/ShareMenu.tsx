"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

// Share a post or reply to Facebook / X / Telegram, or copy the link.
// (Instagram has no web share URL, so it's omitted.)
export function ShareMenu({
  anchor,
  title,
  dict,
}: {
  anchor?: string;
  title: string;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = dict.share;

  function targetUrl() {
    if (anchor) return `${window.location.origin}${window.location.pathname}#${anchor}`;
    return window.location.href;
  }

  function openShare(kind: "facebook" | "x" | "telegram") {
    const u = encodeURIComponent(targetUrl());
    const text = encodeURIComponent(title);
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${text}`,
      telegram: `https://t.me/share/url?url=${u}&text=${text}`,
    };
    window.open(urls[kind], "_blank", "noopener,noreferrer,width=600,height=520");
    setOpen(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(targetUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked
    }
    setOpen(false);
  }

  return (
    <div className="share-wrap">
      <button
        type="button"
        className="action"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4" />
        </svg>
        {copied ? t.copied : t.label}
      </button>

      {open && (
        <>
          <div className="share-backdrop" onClick={() => setOpen(false)} />
          <div className="share-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => openShare("facebook")}>{t.facebook}</button>
            <button type="button" role="menuitem" onClick={() => openShare("x")}>{t.x}</button>
            <button type="button" role="menuitem" onClick={() => openShare("telegram")}>{t.telegram}</button>
            <button type="button" role="menuitem" onClick={copy}>{t.copyLink}</button>
          </div>
        </>
      )}
    </div>
  );
}
