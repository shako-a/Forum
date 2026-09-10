// Keyless Google Maps URLs, all driven by an address string. No API key means
// no billing account and nothing to leak; the trade-off is that the embed
// geocodes the text itself, so the fuller the address the better the pin.
// Client-safe.

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function mapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}
