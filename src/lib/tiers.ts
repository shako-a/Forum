// Presentation helpers for paid packages. The packages themselves now live in
// the database and are managed from the admin panel (see lib/packages.ts) —
// this file only holds formatting shared by the public and admin views.

/** "$5" for whole dollars, "$2.50" otherwise. */
export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

type TierFlags = { isSupporter?: boolean; isDonor?: boolean; isPro?: boolean };

// Whether the viewer already holds a package. The three built-ins are carried
// by their long-standing User booleans; anything an admin created is carried by
// a UserPackage grant, surfaced here as `heldKeys`.
export function holdsPackage(
  u: (TierFlags & { heldKeys?: string[] }) | null | undefined,
  pkg: { key: string },
): boolean {
  if (!u) return false;
  if (u.heldKeys?.includes(pkg.key)) return true;
  if (pkg.key === "SUPPORTER") return !!u.isSupporter;
  if (pkg.key === "DONOR") return !!u.isDonor;
  if (pkg.key === "PRO") return !!u.isPro;
  return false;
}
