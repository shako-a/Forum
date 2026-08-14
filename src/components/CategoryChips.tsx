"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type ChipCategory = {
  id: string;
  slug: string;
  name: string;
  color: string;
  showLock: boolean;
};

// How many chips show before the "+ all topics" expander. Six fills roughly
// three rows in the sidebar column — enough to browse, short enough that the
// nav above it still dominates.
const COLLAPSED_COUNT = 6;

export function CategoryChips({
  categories,
  locale,
  moreLabel,
  lessLabel,
}: {
  categories: ChipCategory[];
  locale: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const overflows = categories.length > COLLAPSED_COUNT;
  const visible = expanded || !overflows ? categories : categories.slice(0, COLLAPSED_COUNT);

  return (
    <div className="cat-chips">
      {visible.map((c) => {
        const href = `/${locale}/c/${c.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={c.id}
            href={href}
            className={`cat-chip${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            // Each category's accent drives the chip's fill, border and text
            // via color-mix in globals.css.
            style={{ "--cat": c.color } as React.CSSProperties}
          >
            {c.name}
            {c.showLock && <span className="lock">🔒</span>}
          </Link>
        );
      })}

      {overflows && (
        <button type="button" className="cat-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
