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

// Posting real-estate listings rides the same Professional bracket as business
// profiles and job postings, and has its own feature key so an admin-created
// package can grant it separately.
export function canPostListing(u: Viewer): boolean {
  return canRegisterBusiness(u) || hasFeature(u, "realEstate");
}

// Marketplace selling is free for every member for now. Flip this to false to
// make it a paid perk: Pro keeps it, and any package carrying the "market"
// feature key (already in the catalogue) grants it.
export const MARKET_FREE_FOR_ALL = true;

export function canSellOnMarket(u: Viewer): boolean {
  if (!u) return false;
  if (MARKET_FREE_FOR_ALL) return true;
  return u.isPro || hasFeature(u, "market");
}

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
