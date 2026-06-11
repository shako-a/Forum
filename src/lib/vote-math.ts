// Pure vote toggle math — the single source of truth shared by the server action
// and the client optimistic update. No imports so it's safe on both sides.

export type Vote = -1 | 0 | 1;

export function normalizeDirection(value: number): 1 | -1 {
  return value >= 0 ? 1 : -1;
}

/**
 * Given the user's existing vote (-1/0/1) and the direction they clicked,
 * return their new vote and the delta to apply to the aggregate score.
 *
 *   none + up        →  myVote +1, delta +1
 *   up   + up        →  myVote  0, delta -1   (toggle off)
 *   down + down      →  myVote  0, delta +1   (toggle off)
 *   up   + down      →  myVote -1, delta -2   (switch)
 *   down + up        →  myVote +1, delta +2   (switch)
 */
export function resolveVote(existing: Vote, clicked: 1 | -1): { myVote: Vote; delta: number } {
  if (existing === 0) return { myVote: clicked, delta: clicked };
  if (existing === clicked) return { myVote: 0, delta: -clicked };
  return { myVote: clicked, delta: clicked - existing };
}
