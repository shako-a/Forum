"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMarketFavorite } from "@/app/actions/market";

// Heart toggle with optimistic state. Guests are sent to login.
export function FavoriteButton({
  listingId,
  saved,
  loggedIn,
  loginHref,
  labels,
  withLabel = false,
}: {
  listingId: string;
  saved: boolean;
  loggedIn: boolean;
  loginHref: string;
  labels: { save: string; saved: string };
  withLabel?: boolean;
}) {
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(loginHref);
      return;
    }
    const next = !on;
    setOn(next);
    start(async () => {
      const result = await toggleMarketFavorite(listingId);
      setOn(result);
    });
  }

  return (
    <button
      type="button"
      className={`mk-fav${on ? " on" : ""}${withLabel ? " mk-fav-labeled" : ""}`}
      aria-pressed={on}
      aria-label={on ? labels.saved : labels.save}
      title={on ? labels.saved : labels.save}
      disabled={pending}
      onClick={onClick}
    >
      <span aria-hidden="true">{on ? "♥" : "♡"}</span>
      {withLabel && <span>{on ? labels.saved : labels.save}</span>}
    </button>
  );
}
