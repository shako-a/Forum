"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleSave } from "@/app/actions/saves";

// Bookmark icon — outline when unsaved, solid fill when saved.
const Bookmark = ({ filled }: { filled: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export function SaveButton({
  postId,
  initialSaved,
  canSave,
  loginHref,
  saveLabel,
  savedLabel,
}: {
  postId: string;
  initialSaved: boolean;
  canSave: boolean;
  loginHref: string;
  saveLabel: string;
  savedLabel: string;
}) {
  const [base, setBase] = useState(initialSaved);
  const [saved, setOptimistic] = useOptimistic(base, (_cur, next: boolean) => next);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!canSave) {
      window.location.href = loginHref;
      return;
    }
    startTransition(async () => {
      setOptimistic(!saved);
      try {
        const res = await toggleSave(postId);
        setBase(res.saved);
      } catch {
        // optimistic value reverts when the transition settles
      }
    });
  }

  return (
    <button
      type="button"
      className={saved ? "action save-btn saved" : "action save-btn"}
      onClick={onClick}
      aria-pressed={saved}
    >
      <Bookmark filled={saved} />
      {saved ? savedLabel : saveLabel}
    </button>
  );
}
