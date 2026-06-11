import "server-only";
import { db } from "@/lib/db";
import { resolveVote, normalizeDirection, type Vote } from "@/lib/vote-math";

export type VoteResult = { score: number; myVote: number };

// Apply a vote to a post or reply, keeping the denormalized score in sync.
// Pure toggle math lives in vote-math.ts; this just persists it transactionally.
export async function castVote(
  target: "post" | "reply",
  id: string,
  userId: string,
  rawValue: number,
): Promise<VoteResult> {
  const clicked = normalizeDirection(rawValue);

  if (target === "post") {
    return db.$transaction(async (tx) => {
      const existing = await tx.postVote.findUnique({
        where: { userId_postId: { userId, postId: id } },
        select: { id: true, value: true },
      });
      const { myVote, delta } = resolveVote((existing?.value ?? 0) as Vote, clicked);

      if (!existing) await tx.postVote.create({ data: { postId: id, userId, value: clicked } });
      else if (myVote === 0) await tx.postVote.delete({ where: { id: existing.id } });
      else await tx.postVote.update({ where: { id: existing.id }, data: { value: clicked } });

      const post = await tx.post.update({
        where: { id },
        data: { score: { increment: delta } },
        select: { score: true },
      });
      return { score: post.score, myVote };
    });
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.replyVote.findUnique({
      where: { userId_replyId: { userId, replyId: id } },
      select: { id: true, value: true },
    });
    const { myVote, delta } = resolveVote((existing?.value ?? 0) as Vote, clicked);

    if (!existing) await tx.replyVote.create({ data: { replyId: id, userId, value: clicked } });
    else if (myVote === 0) await tx.replyVote.delete({ where: { id: existing.id } });
    else await tx.replyVote.update({ where: { id: existing.id }, data: { value: clicked } });

    const reply = await tx.reply.update({
      where: { id },
      data: { score: { increment: delta } },
      select: { score: true },
    });
    return { score: reply.score, myVote };
  });
}
