import "server-only";

// Round-robin cursor: sidebar ads rotate one-per-view in position (sortOrder)
// order. The caller passes ads already sorted by position. State is per server
// process — sequential at this scale; multiple instances each rotate on their
// own, which is fine for ad rotation.
let cursor = 0;

export function pickRotatingAd<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const item = items[cursor % items.length];
  cursor = (cursor + 1) % 1_000_000;
  return item;
}
