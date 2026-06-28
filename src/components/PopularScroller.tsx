"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A horizontally scrollable container that ALSO auto-scrolls on its own. It
// drives a real scroll position (scrollLeft) rather than a CSS transform, so
// users can drag/swipe/wheel to scroll manually too. Auto-scroll pauses while
// the pointer is over it (hover or drag) and resumes on leave. The track holds
// two identical copies of the content, so wrapping at the halfway point loops
// seamlessly. Respects prefers-reduced-motion (manual scroll only).
export function PopularScroller({
  children,
  speed = 31, // px per second — matches the previous marquee speed
}: {
  children: ReactNode;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // manual only

    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      if (!last) last = t;
      const dt = (t - last) / 1000;
      last = t;
      if (!paused.current) {
        const half = el.scrollWidth / 2; // width of one copy (two identical copies)
        const max = el.scrollWidth - el.clientWidth; // furthest the browser will scroll
        if (max > 1) {
          el.scrollLeft += speed * dt;
          if (half > 1 && el.scrollLeft >= half) {
            el.scrollLeft -= half; // seamless wrap when there's a full copy to spare
          } else if (el.scrollLeft >= max - 1) {
            el.scrollLeft = 0; // reached the end → start over from the first post
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  const pause = () => {
    paused.current = true;
  };
  const resume = () => {
    paused.current = false;
  };

  return (
    <div
      ref={ref}
      className="pop-loop"
      onPointerEnter={pause}
      onPointerDown={pause}
      onPointerLeave={resume}
      onPointerUp={resume}
    >
      {children}
    </div>
  );
}
