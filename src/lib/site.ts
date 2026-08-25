// The canonical public origin of the site.
//
// This deliberately does NOT fall back to the request host the way the email
// helper does. Social scrapers (Facebook, X, Telegram, Slack) need absolute
// URLs for og:image and og:url, and those URLs get cached on their side for
// weeks — so a card scraped through the DigitalOcean origin host would keep
// pointing people at shark-app-*.ondigitalocean.app long after the fact.
// Pinning the real domain here keeps every share card on geoglobally.com.
//
// Override with SITE_URL only for a staging deployment that should advertise
// itself under a different domain.
export const SITE_URL = (process.env.SITE_URL ?? "https://geoglobally.com").replace(/\/$/, "");

/** Bare host, for display on share cards and in footers. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
