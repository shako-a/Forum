"use client";

import { useState } from "react";
import Link from "@/components/Link";

// Small slideable photo strip for directory cards. The image itself links to
// the listing; the arrows/dots are overlaid siblings (never nested in the
// link) so tapping them only slides.
export function PhotoSlider({
  photos,
  href,
  alt,
  placeholder,
}: {
  photos: string[];
  href: string;
  alt: string;
  placeholder: string; // icon shown when the listing has no photos
}) {
  const [i, setI] = useState(0);
  const n = photos.length;

  return (
    <div className="re-slider">
      <Link href={href} className="re-slider-img" tabIndex={-1} aria-hidden="true">
        {n > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[i]} alt={alt} loading="lazy" />
        ) : (
          <span className="re-slider-placeholder">{placeholder}</span>
        )}
      </Link>
      {n > 1 && (
        <>
          <button
            type="button"
            className="re-slider-arrow re-prev"
            aria-label="Previous photo"
            onClick={() => setI((v) => (v - 1 + n) % n)}
          >
            ‹
          </button>
          <button
            type="button"
            className="re-slider-arrow re-next"
            aria-label="Next photo"
            onClick={() => setI((v) => (v + 1) % n)}
          >
            ›
          </button>
          <div className="re-slider-dots">
            {photos.map((_, d) => (
              <span key={d} className={d === i ? "on" : ""} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
