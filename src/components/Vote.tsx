"use client";

import { useState, useOptimistic, useTransition } from "react";
import { votePost, voteReply } from "@/app/actions/votes";
import { resolveVote, type Vote as VoteValue } from "@/lib/vote-math";

type State = { score: number; my: VoteValue };

// One bold arrow shape; the fill is toggled — chosen = solid (filled), the
// other = hollow outline. Both keep a bold stroke.
const UpArrow = ({ filled }: { filled?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M10.7 5.1 Q12 3.8 13.3 5.1 L18.2 10 Q19.5 11.3 17.7 11.3 L15.9 11.3 Q14.7 11.3 14.7 12.5 L14.7 18.8 Q14.7 20 13.5 20 L10.5 20 Q9.3 20 9.3 18.8 L9.3 12.5 Q9.3 11.3 8.1 11.3 L6.3 11.3 Q4.5 11.3 5.8 10 Z" />
  </svg>
);
const DownArrow = ({ filled }: { filled?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M10.7 18.9 Q12 20.2 13.3 18.9 L18.2 14 Q19.5 12.7 17.7 12.7 L15.9 12.7 Q14.7 12.7 14.7 11.5 L14.7 5.2 Q14.7 4 13.5 4 L10.5 4 Q9.3 4 9.3 5.2 L9.3 11.5 Q9.3 12.7 8.1 12.7 L6.3 12.7 Q4.5 12.7 5.8 14 Z" />
  </svg>
);

export function Vote({
  id,
  kind,
  initialScore,
  initialVote,
  canVote,
  loginHref,
  orientation = "vertical",
}: {
  id: string;
  kind: "post" | "reply";
  initialScore: number;
  initialVote: number;
  canVote: boolean;
  loginHref: string;
  orientation?: "vertical" | "horizontal";
}) {
  // Server truth; updated from the action's authoritative result.
  const [base, setBase] = useState<State>({ score: initialScore, my: initialVote as VoteValue });

  // Optimistic view derived from base using the SAME math as the server.
  const [view, applyOptimistic] = useOptimistic(base, (cur, clicked: 1 | -1) => {
    const { myVote, delta } = resolveVote(cur.my, clicked);
    return { score: cur.score + delta, my: myVote };
  });

  const [, startTransition] = useTransition();

  function cast(clicked: 1 | -1) {
    if (!canVote) {
      window.location.href = loginHref;
      return;
    }
    startTransition(async () => {
      applyOptimistic(clicked);
      try {
        const res = kind === "post" ? await votePost(id, clicked) : await voteReply(id, clicked);
        setBase({ score: res.score, my: res.myVote as VoteValue });
      } catch {
        // Leave base unchanged — the optimistic value reverts when the
        // transition settles, so a failed vote snaps back.
      }
    });
  }

  // Wrapper carries the user's current vote so the whole pill can fill with the
  // chosen color (up = blue, down = orange-red).
  const stateClass = view.my === 1 ? " up" : view.my === -1 ? " down" : "";
  const wrapClass = (orientation === "vertical" ? "vote-rail" : "vote-inline") + stateClass;
  return (
    <div className={wrapClass}>
      <button
        type="button"
        className={view.my === 1 ? "vote-btn voted" : "vote-btn"}
        aria-label="Upvote"
        aria-pressed={view.my === 1}
        onClick={() => cast(1)}
      >
        <UpArrow filled={view.my === 1} />
      </button>
      <span className={view.my === 1 ? "vote-count hot" : "vote-count"}>{view.score}</span>
      <button
        type="button"
        className={view.my === -1 ? "vote-btn down voted" : "vote-btn down"}
        aria-label="Downvote"
        aria-pressed={view.my === -1}
        onClick={() => cast(-1)}
      >
        <DownArrow filled={view.my === -1} />
      </button>
    </div>
  );
}
