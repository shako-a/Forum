// Client-side GA4 event helper. Fires a gtag event if analytics is loaded;
// no-ops otherwise (GA unconfigured, or Consent Mode is withholding — e.g. an
// EU visitor who hasn't accepted, in which case gtag queues/suppresses it).
// Safe to call from any client component.
type Gtag = (...args: unknown[]) => void;

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") gtag("event", event, params ?? {});
}
