"use client";

import { useEffect, useState } from "react";
import { resendVerification } from "@/app/actions/account-recovery";

// Soft nudge for users who haven't confirmed their email. Nothing is blocked —
// this is a dismissible strip below the header asking them to verify.
//
// It renders nothing on the server and on the first client render, then shows
// after mount: that avoids a hydration mismatch on the localStorage-backed
// dismissal, and means the layout only shifts for the (few) unverified users.
// While shown it adds `has-verify-banner` to <body>, which the CSS uses to push
// the fixed header and page content down by the banner's height.
export function VerifyBanner({
  locale,
  text,
  cta,
  dismissLabel,
}: {
  locale: string;
  text: string;
  cta: string;
  dismissLabel: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("vb-dismissed") === "1") return;
    setShow(true);
    document.body.classList.add("has-verify-banner");
    return () => document.body.classList.remove("has-verify-banner");
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem("vb-dismissed", "1");
    document.body.classList.remove("has-verify-banner");
    setShow(false);
  }

  return (
    <div className="verify-banner" role="status">
      <span className="vb-text">⚠ {text}</span>
      <form action={resendVerification}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="vb-cta">
          {cta}
        </button>
      </form>
      <button type="button" className="vb-x" onClick={dismiss} aria-label={dismissLabel}>
        ✕
      </button>
    </div>
  );
}
