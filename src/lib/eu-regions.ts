// Countries where GDPR / UK-GDPR / ePrivacy require prior consent before
// analytics cookies: the EEA (EU-27 + Iceland, Liechtenstein, Norway) plus the
// UK. Used two ways:
//   1. As the `region` list for Google Consent Mode's denied-by-default state,
//      so GA withholds storage there until the visitor accepts.
//   2. To decide whether to show the consent banner at all (EU visitors only —
//      the forum's audience is mostly US, so everyone else is tracked directly).
export const EU_CONSENT_REGIONS = [
  // EU-27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA (non-EU)
  "IS", "LI", "NO",
  // United Kingdom (UK GDPR)
  "GB",
] as const;

const EU_SET = new Set<string>(EU_CONSENT_REGIONS);

// True when a 2-letter ISO country code is in the consent-required set.
export function isEuRegion(countryCode: string | null | undefined): boolean {
  return !!countryCode && EU_SET.has(countryCode.toUpperCase());
}
