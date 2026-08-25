import "server-only";
import { ZIP_DATA, ZIP_STATES, ZIP_RECORD_LEN, ZIP_COUNT } from "@/lib/zip-data";

// ZIP-code geography: centroid lookup and distance maths for the radius
// filters on the marketplace and real-estate directories. The dataset is a
// sorted fixed-width string (see zip-data.ts), so a lookup is a binary search
// with no parsing or Map allocation at boot.

export type LatLng = { lat: number; lng: number };
export type ZipInfo = LatLng & { zip: string; state: string };

/** Normalize user input to a 5-digit ZIP ("94110-1234" → "94110"), or null. */
export function normalizeZip(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return m ? m[1] : null;
}

function recordAt(i: number): ZipInfo {
  const at = i * ZIP_RECORD_LEN;
  return {
    zip: ZIP_DATA.slice(at, at + 5),
    lat: Number(ZIP_DATA.slice(at + 5, at + 10)) / 1000,
    lng: (Number(ZIP_DATA.slice(at + 10, at + 16)) - 180000) / 1000,
    state: ZIP_STATES.slice(i * 2, i * 2 + 2),
  };
}

/** Centroid of a US ZIP code, or null when it isn't a known ZIP. */
export function lookupZip(input: unknown): ZipInfo | null {
  const zip = normalizeZip(input);
  if (!zip) return null;
  let lo = 0;
  let hi = ZIP_COUNT - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const key = ZIP_DATA.slice(mid * ZIP_RECORD_LEN, mid * ZIP_RECORD_LEN + 5);
    if (key === zip) return recordAt(mid);
    if (key < zip) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

export const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Square that fully contains the radius circle — used to narrow the SQL query
 * on the indexed lat/lng columns before the exact distance check in JS.
 */
export function boundingBox(center: LatLng, miles: number) {
  const latDelta = miles / 69.0546; // miles per degree of latitude
  // Degrees of longitude shrink toward the poles; guard the cosine near them.
  const cos = Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
  const lngDelta = miles / (69.0546 * cos);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/** Radius choices offered in the filter panels (miles). */
export const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250] as const;
export const DEFAULT_RADIUS = 25;
export function isRadius(v: unknown): boolean {
  return typeof v === "number" && (RADIUS_OPTIONS as readonly number[]).includes(v);
}
