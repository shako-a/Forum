"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setRsvp, type RsvpResult } from "@/app/actions/events";
import type { RsvpStatus } from "@/generated/prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";

// Going / Interested / Not going, with live counts.
//
// Pressing the answer you already gave takes it back — that's the only way to
// un-answer, so there's no fourth "clear" button cluttering the row. Counts
// update optimistically and settle on whatever the server returns.
export function RsvpButtons({
  postId,
  initial,
  canRsvp,
  loginHref,
  dict,
}: {
  postId: string;
  initial: RsvpResult;
  canRsvp: boolean;
  loginHref: string;
  dict: Dictionary;
}) {
  const t = dict.events;
  const [base, setBase] = useState(initial);
  const [view, setView] = useOptimistic(base, (cur: RsvpResult, next: RsvpStatus) => {
    const delta = (s: RsvpStatus) => (cur.mine === s ? -1 : next === s ? 1 : 0);
    return {
      going: cur.going + delta("GOING"),
      interested: cur.interested + delta("INTERESTED"),
      notGoing: cur.notGoing + delta("NOT_GOING"),
      mine: cur.mine === next ? null : next,
    };
  });
  const [pending, start] = useTransition();

  function choose(status: RsvpStatus) {
    start(async () => {
      setView(status);
      try {
        setBase(await setRsvp(postId, status));
      } catch {
        // optimistic value reverts when the transition settles
      }
    });
  }

  const options: { status: RsvpStatus; label: string; count: number; icon: string }[] = [
    { status: "GOING", label: t.going, count: view.going, icon: "✓" },
    { status: "INTERESTED", label: t.interested, count: view.interested, icon: "★" },
    { status: "NOT_GOING", label: t.notGoing, count: view.notGoing, icon: "✕" },
  ];

  return (
    <div className="rsvp-row" role="group" aria-label={t.rsvpLabel}>
      {options.map((o) => {
        const on = view.mine === o.status;
        const cls = `rsvp-btn rsvp-${o.status.toLowerCase().replace("_", "-")}${on ? " on" : ""}`;
        const inner = (
          <>
            <span className="rsvp-ico" aria-hidden="true">{o.icon}</span>
            {o.label}
            <span className="rsvp-count">{o.count}</span>
          </>
        );
        // A guest gets a real link to the login page rather than a button that
        // navigates — it opens in a new tab, and the counts stay readable.
        return canRsvp ? (
          <button
            key={o.status}
            type="button"
            className={cls}
            aria-pressed={on}
            disabled={pending}
            title={on ? t.clearHint : undefined}
            onClick={() => choose(o.status)}
          >
            {inner}
          </button>
        ) : (
          <a key={o.status} href={loginHref} className={cls}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}
