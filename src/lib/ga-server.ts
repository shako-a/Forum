import "server-only";
import { cookies } from "next/headers";

// Queue a GA4 event to fire on the next page load. Used by server actions that
// redirect on success — the client never sees their return value, so instead the
// action drops a short-lived flash cookie and <GaEventFlash> reads it, fires the
// event, and clears it after the redirect lands. No-ops when analytics is off.
export async function flagGaEvent(name: string): Promise<void> {
  if (!process.env.NEXT_PUBLIC_GA_ID) return; // analytics off — don't set cookies
  const store = await cookies();
  store.set("ga_event", name, {
    path: "/",
    maxAge: 60,
    httpOnly: false, // must be readable by the client to fire the event
    sameSite: "lax",
  });
}
