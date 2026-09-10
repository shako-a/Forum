import { Section } from "@/components/listing/Section";
import { TrackedLink } from "@/components/listing/TrackedLink";
import { mapsDirectionsUrl, mapsEmbedUrl, mapsSearchUrl } from "@/lib/maps";
import type { ContactTarget } from "@/lib/modules";

// Map + "Get directions". `query` is the fullest address we have — a street
// address pins a door, a city and state still put the reader in the right
// neighbourhood.
export function LocationCard({
  title,
  query,
  address,
  mapTitle,
  openLabel,
  directionsLabel,
  target,
}: {
  title: string;
  query: string;
  address?: string;
  mapTitle: string;
  openLabel: string;
  directionsLabel: string;
  target: ContactTarget;
}) {
  if (!query) return null;
  return (
    <Section title={title}>
      {address && <p className="listing-address">{address}</p>}
      <div className="listing-map">
        <iframe src={mapsEmbedUrl(query)} title={mapTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        <a href={mapsSearchUrl(query)} target="_blank" rel="noopener noreferrer nofollow" className="listing-map-open">
          {openLabel} ↗
        </a>
      </div>
      <TrackedLink target={target} kind="directions" href={mapsDirectionsUrl(query)} external className="btn btn-primary listing-directions">
        📍 {directionsLabel}
      </TrackedLink>
    </Section>
  );
}
