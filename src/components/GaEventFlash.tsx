"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

// Fires a GA4 event that a redirecting server action queued via the `ga_event`
// flash cookie (see flagGaEvent), then clears the cookie so it fires exactly
// once — on the page the redirect landed on.
//
// A server-action redirect is a SOFT navigation: the root layout (and this
// component) doesn't remount, so a mount-only effect would miss the cookie set
// during the redirect. Keying the effect on the pathname re-checks on every
// route change, catching the event on the page the redirect lands on.
export function GaEventFlash() {
  const pathname = usePathname();
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)ga_event=([^;]+)/);
    if (!match) return;
    const name = decodeURIComponent(match[1]);
    if (!name) return;

    // gtag is defined by the GA init script, which loads afterInteractive — it
    // may not be ready the instant this effect runs. Wait for it (briefly), and
    // only clear the cookie once the event actually fires, so a not-yet-ready
    // gtag doesn't swallow the event.
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const fire = () => {
      if (typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
        document.cookie = "ga_event=; path=/; max-age=0";
        track(name);
      } else if (tries++ < 30) {
        timer = setTimeout(fire, 100); // up to ~3s
      }
    };
    fire();
    return () => clearTimeout(timer);
  }, [pathname]);
  return null;
}
