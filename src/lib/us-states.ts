// US states + the country Georgia (the diaspora's home country), used by the
// profile "State" picker. State names are English-only by request; only the
// country Georgia is localized (and shown with its flag).

import type { Locale } from "@/i18n/config";

export type StateOption = { abbr: string; name: string };

// 50 states + DC, alphabetical by name.
export const US_STATES: StateOption[] = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

// The home country Georgia — a distinct option (NOT the US state "Georgia"/GA).
// Stored as "GE" to avoid colliding with the US state abbreviation "GA".
export const GEORGIA_VALUE = "GE";
export const GEORGIA_FLAG = "🇬🇪";

// Country-level United States — lets a user pick the US without naming a state,
// while still being grouped with US-wide updates. Stored as "US" (distinct from
// any two-letter state abbreviation).
export const USA_VALUE = "US";
export const USA_FLAG = "🇺🇸";

export function georgiaName(locale: Locale): string {
  return locale === "ka" ? "საქართველო" : "Georgia";
}

export function usaName(locale: Locale): string {
  return locale === "ka" ? "აშშ" : "United States";
}

const ABBR_TO_NAME = new Map(US_STATES.map((s) => [s.abbr, s.name]));

export function isKnownUsState(abbr: string | null | undefined): boolean {
  return !!abbr && ABBR_TO_NAME.has(abbr);
}

// Human-readable label for a stored state value (used on public profiles).
// Falls back to the raw value for legacy free-text entries.
export function stateLabel(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (value === GEORGIA_VALUE) return `${GEORGIA_FLAG} ${georgiaName(locale)}`;
  if (value === USA_VALUE) return `${USA_FLAG} ${usaName(locale)}`;
  return ABBR_TO_NAME.get(value) ?? value;
}
