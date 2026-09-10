// The marketplace modules.
//
// Five parts of the site are listings rather than discussion: the business
// directory, the jobs board, real estate, the marketplace and the auto market.
// They share one detail-page layout, one featured bar, one contact ledger and
// one admin surface, and this is the vocabulary all of those key on.
//
// Client-safe: no database access, so forms and buttons can import it.
import type { Dictionary } from "@/i18n/dictionaries";

export const MODULES = ["business", "jobs", "estate", "market", "auto"] as const;
export type ModuleKey = (typeof MODULES)[number];

export function isModuleKey(x: unknown): x is ModuleKey {
  return typeof x === "string" && (MODULES as readonly string[]).includes(x);
}

export const MODULE_META: Record<ModuleKey, { icon: string; base: string }> = {
  business: { icon: "🏢", base: "/business" },
  jobs: { icon: "💼", base: "/jobs" },
  estate: { icon: "🏠", base: "/realestate" },
  market: { icon: "🛍️", base: "/market" },
  auto: { icon: "🚗", base: "/auto" },
};

/** Locale-less path to a listing. Jobs address by id; the rest by slug. */
export function listingPath(module: ModuleKey, slugOrId: string): string {
  return `${MODULE_META[module].base}/${slugOrId}`;
}

export function moduleLabel(module: ModuleKey, dict: Dictionary): string {
  return dict.modules[module];
}

// Every contact action a visitor can take on a listing. "message" is the one
// that goes through the forum inbox; the rest are outbound links whose click
// is the only signal we get.
export const INTERACTION_KINDS = [
  "call",
  "whatsapp",
  "email",
  "website",
  "booking",
  "directions",
  "social",
  "share",
  "message",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export function isInteractionKind(x: unknown): x is InteractionKind {
  return typeof x === "string" && (INTERACTION_KINDS as readonly string[]).includes(x);
}

/**
 * What the client sends to name a listing. Deliberately just the module and
 * the id: the server re-resolves the title, owner and business from the row,
 * so a forged form can't attribute a lead to another business or message an
 * arbitrary member.
 */
export type ContactTarget = { module: ModuleKey; listingId: string };
