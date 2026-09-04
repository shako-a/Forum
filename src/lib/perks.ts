// Subscription perks.
//
// Two things can grant a perk:
//   1. the three original tiers, still mirrored on User.isDonor/isPro/
//      isSupporter — kept so all pre-existing gating keeps working untouched;
//   2. any package the user holds that lists the matching feature key, which
//      is what makes an admin-created package actually grant something.
//
// `featureKeys` comes from getCurrentUser (see getUserFeatureKeys). It is
// optional so callers holding only a partial user still typecheck.
type Viewer = {
  isDonor: boolean;
  isPro: boolean;
  isSupporter?: boolean;
  featureKeys?: string[];
  aiAsk?: boolean;
  aiTranslate?: boolean;
} | null | undefined;

function hasFeature(u: Viewer, key: string): boolean {
  return !!u?.featureKeys?.includes(key);
}

// AI entitlement is per tool, not per topic.
//
// Each tool is its own gate, checked server-side in the action that runs it —
// a system prompt that says "only translate" is a request to the model, not a
// boundary, so it can't be what a plan sells. What the tools share is the
// money: one micro-USD allowance (lib/ai-credits.ts) that every call draws on,
// which is the thing that actually has to be capped.
//
// Three ways to hold a tool: a built-in tier, a package feature key, or the
// direct per-user grant an admin sets in Admin → Users.

/** The assistant: forum navigation and questions about life abroad. */
export function hasAiAccess(u: Viewer): boolean {
  return !!u && (u.isDonor || u.isPro || hasFeature(u, "askAi") || !!u.aiAsk);
}

/** The translator. Attached to no package by default — granted per user. */
export function hasAiTranslate(u: Viewer): boolean {
  return !!u && (hasFeature(u, "aiTranslate") || !!u.aiTranslate);
}

/** Holds at least one AI tool — used for "is AI on for this account". */
export function hasAnyAi(u: Viewer): boolean {
  return hasAiAccess(u) || hasAiTranslate(u);
}

// Posting in the listing areas — real estate, marketplace, auto, jobs and the
// business registry — is governed by the admin-managed modes in
// lib/posting-access.ts (canPostIn), not by fixed perk functions here. The
// "business" perk key still exists, so flipping that area to "perk" in
// Admin → More restores Professional-only registration without a deploy.

// Profile and feed customization: the Supporter bracket's headline perk, and
// included in both higher tiers (paying more never gives you less).
export function canCustomize(u: Viewer): boolean {
  return (
    !!u &&
    (!!u.isSupporter ||
      u.isDonor ||
      u.isPro ||
      hasFeature(u, "profileCustom") ||
      hasFeature(u, "feedCustom"))
  );
}
