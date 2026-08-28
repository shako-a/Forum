"use client";

import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

// Makes a whole feed card open its post, without breaking anything inside it.
//
// The card is full of its own controls (vote, save, share, delete, the category
// chip, the author, the comment count), so a blanket link would either swallow
// them or nest interactive elements. Instead the click is inspected:
//
//   - a click that landed on any control or link is left alone;
//   - a click that ends a text selection is left alone, so quoting an excerpt
//     still works;
//   - ⌘/Ctrl/Shift-click and middle-click open a new tab, as on a real link.
//
// The title stays a genuine <a>, so keyboard users, screen readers and
// "copy link address" all keep working — this only adds a mouse affordance,
// and deliberately adds no second tab stop.
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role='button'], [contenteditable]";

export function ClickableCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function open(e: MouseEvent<HTMLElement>, newTab: boolean) {
    if (e.defaultPrevented) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    // A drag that selected text ends in a click; don't navigate out from under it.
    if (window.getSelection()?.toString()) return;

    if (newTab) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    <article
      className={className ? `${className} card-clickable` : "card-clickable"}
      onClick={(e) => open(e, e.metaKey || e.ctrlKey || e.shiftKey)}
      onAuxClick={(e) => {
        if (e.button === 1) open(e, true); // middle click
      }}
    >
      {children}
    </article>
  );
}
