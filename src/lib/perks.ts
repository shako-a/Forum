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
} | null | undefined;

function hasFeature(u: Viewer, key: string): boolean {
  return !!u?.featureKeys?.includes(key);
}

export function hasAiAccess(u: Viewer): boolean {
  return !!u && (u.isDonor || u.isPro || hasFeature(u, "askAi"));
}

// Registering and managing business accounts is a Professional-tier perk.
export function canRegisterBusiness(u: Viewer): boolean {
  return !!u && (u.isPro || hasFeature(u, "business"));
}

// Posting in the listing areas (real estate, marketplace, auto, jobs) is
// governed by the admin-managed modes in lib/posting-access.ts (canPostIn),
// not by fixed perk functions here.

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
