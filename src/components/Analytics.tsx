import Script from "next/script";
import { EU_CONSENT_REGIONS } from "@/lib/eu-regions";

// Google Analytics 4 with Consent Mode v2. Renders only when a Measurement ID
// is configured (NEXT_PUBLIC_GA_ID = "G-XXXXXXXX"), so the app runs unchanged
// until analytics is set up.
//
// Consent defaults are region-aware: DENIED in the EEA + UK (Google enforces
// this by the visitor's IP), GRANTED everywhere else. That means US visitors —
// the bulk of the audience — are tracked immediately with no banner, while EU
// visitors stay in a cookieless/consent-pending state until they accept via the
// ConsentBanner (which only shows to them).
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  const euRegions = JSON.stringify([...EU_CONSENT_REGIONS]);
  const init = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    // Default: granted everywhere...
    gtag('consent', 'default', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    // ...but denied in the EEA + UK until the visitor consents (banner).
    gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      region: ${euRegions},
    });
    gtag('config', '${gaId}');
  `;

  return (
    <>
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: init }}
      />
      <Script
        id="ga-lib"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    </>
  );
}
