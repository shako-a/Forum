"use client";

import { useState } from "react";

// The media inside a sidebar ad, with graceful failure.
//
// A sidebar ad is only as visible as its image: if the URL 404s (e.g. an ad
// saved before object storage was configured, or a since-deleted upload), a
// plain <img> collapses to a blank white card that reads as "the ad isn't
// showing". Here an errored image is swapped for a branded gradient panel, so
// the slot always looks intentional and the ad title (if any) stays legible on
// top of it — never an empty box.
export function SidebarAdImage({ src, isVideo }: { src: string; isVideo: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="sidebar-ad-media sidebar-ad-fallback" aria-hidden="true" />;
  }
  if (isVideo) {
    return (
      <video
        className="sidebar-ad-media"
        src={src}
        muted
        loop
        autoPlay
        playsInline
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="sidebar-ad-media" src={src} alt="" onError={() => setFailed(true)} />
  );
}
