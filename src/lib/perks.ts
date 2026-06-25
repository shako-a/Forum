// Subscription perks. Both paid tiers — Donor and Professional — unlock AI
// access, so gate the "Ask AI" feature on either. Centralized here so future
// tiers / Stripe logic only change in one place.
export function hasAiAccess(u: { isDonor: boolean; isPro: boolean } | null | undefined): boolean {
  return !!u && (u.isDonor || u.isPro);
}

// Registering and managing business accounts is a Professional-tier perk.
export function canRegisterBusiness(u: { isPro: boolean } | null | undefined): boolean {
  return !!u && u.isPro;
}
