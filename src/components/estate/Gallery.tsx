"use client";

import { useState } from "react";

// Detail-page gallery: hero image with slider arrows + a clickable thumbnail
// strip. Clicking the hero opens the full-size image in a new tab.
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const n = photos.length;
  if (n === 0) return null;

  return (
    <div className="re-gallery">
      <div className="re-gallery-hero">
        <a href={photos[i]} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[i]} alt={alt} />
        </a>
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
            <span className="re-gallery-count">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="re-gallery-thumbs">
          {photos.map((url, d) => (
            <button
              key={url}
              type="button"
              className={`re-gallery-thumb${d === i ? " on" : ""}`}
              onClick={() => setI(d)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
