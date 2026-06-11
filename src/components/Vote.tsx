"use client";

import { useState, useOptimistic, useTransition } from "react";
import { votePost, voteReply } from "@/app/actions/votes";
import { resolveVote, type Vote as VoteValue } from "@/lib/vote-math";

type State = { score: number; my: VoteValue };

const UpArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const DownArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M19 12l-7 7-7-7" />
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

  const wrapClass = orientation === "vertical" ? "vote-rail" : "vote-inline";
  return (
    <div className={wrapClass}>
      <button
        type="button"
        className={view.my === 1 ? "vote-btn voted" : "vote-btn"}
        aria-label="Upvote"
        aria-pressed={view.my === 1}
        onClick={() => cast(1)}
      >
        <UpArrow />
      </button>
      <span className={view.my === 1 ? "vote-count hot" : "vote-count"}>{view.score}</span>
      <button
        type="button"
        className={view.my === -1 ? "vote-btn down voted" : "vote-btn down"}
        aria-label="Downvote"
        aria-pressed={view.my === -1}
        onClick={() => cast(-1)}
      >
        <DownArrow />
      </button>
    </div>
  );
}
