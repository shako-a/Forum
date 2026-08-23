"use client";

import { useEffect, useState } from "react";
import { isEuRegion } from "@/lib/eu-regions";

// Cookie-consent banner shown ONLY to EU/UK visitors (the rest of the audience
// is tracked directly — see Consent Mode defaults in Analytics). It reads the
// visitor's country once (cached), and if they're in a consent-required region
// and haven't chosen yet, it offers Accept / Decline. Accepting upgrades Google
// Consent Mode to granted; the choice is remembered so it never nags again.

const CHOICE_KEY = "ga-consent"; // "granted" | "denied"
const GEO_KEY = "geo-cc"; // cached ISO country code

type Gtag = (...args: unknown[]) => void;
function grantConsent() {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  gtag?.("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

async function detectCountry(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(GEO_KEY);
    if (cached) return cached;
  } catch {
    // storage blocked — fall through to a live lookup
  }
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    const cc = typeof data?.country_code === "string" ? data.country_code : null;
    if (cc) {
      try {
        localStorage.setItem(GEO_KEY, cc);
      } catch {
        // ignore
      }
    }
    return cc;
  } catch {
    return null;
  }
}

export function ConsentBanner({
  enabled,
  message,
  accept,
  decline,
}: {
  // Whether analytics is configured — resolved on the server (the root layout)
  // and passed in, because a client component can't reliably read a NEXT_PUBLIC
  // env that was only set at run time.
  enabled: boolean;
  message: string;
  accept: string;
  decline: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Nothing to consent to if analytics isn't configured.
    if (!enabled) return;

    let choice: string | null = null;
    try {
      choice = localStorage.getItem(CHOICE_KEY);
    } catch {
      // storage blocked — treat as no prior choice
    }
    if (choice === "granted") {
      grantConsent(); // returning acceptor — re-apply for this session
      return;
    }
    if (choice === "denied") return; // respect the earlier decline

    let cancelled = false;
    detectCountry().then((cc) => {
      if (!cancelled && isEuRegion(cc)) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!show) return null;

  function remember(value: "granted" | "denied") {
    try {
      localStorage.setItem(CHOICE_KEY, value);
    } catch {
      // ignore
    }
  }

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label={message}>
      <p className="consent-text">{message}</p>
      <div className="consent-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            remember("denied");
            setShow(false);
          }}
        >
          {decline}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            grantConsent();
            remember("granted");
            setShow(false);
          }}
        >
          {accept}
        </button>
      </div>
    </div>
  );
}
