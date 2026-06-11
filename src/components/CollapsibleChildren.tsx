"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

// Wraps a reply's nested subtree with a collapse/expand toggle.
export function CollapsibleChildren({
  count,
  dict,
  children,
}: {
  count: number;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="reply-thread">
      <button
        type="button"
        className="thread-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} {open ? dict.post.hide : `${dict.post.show} (${count})`}
      </button>
      {open && children}
    </div>
  );
}
