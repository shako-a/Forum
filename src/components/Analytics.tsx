import Script from "next/script";

// Umami web analytics (self-hosted). Renders the tracking beacon only when both
// env vars are present, so the app runs fine with analytics unconfigured — the
// same graceful-degrade pattern as email. Set these once your Umami server is
// up and redeploy to switch tracking on:
//
//   UMAMI_SRC         full script URL, e.g. https://analytics.geoglobally.com/script.js
//   UMAMI_WEBSITE_ID  the website's UUID from the Umami dashboard
//
// Umami is cookieless and stores no personal data, so no consent banner is
// needed. The script hooks the History API, so client-side route changes are
// tracked automatically — mounting it once in the root layout is enough.
export function Analytics() {
  const src = process.env.UMAMI_SRC;
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;
  return <Script defer src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
