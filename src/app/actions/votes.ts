"use server";

// NOTE: a "use server" module may only export async functions. Keep types and
// helpers in plain modules (see @/lib/voting, @/lib/vote-math).
import { getAuth } from "@/lib/dal";
import { castVote } from "@/lib/voting";

export async function votePost(postId: string, value: number) {
  const auth = await getAuth();
  if (!auth) throw new Error("unauthorized");
  return castVote("post", postId, auth.userId, value);
}

export async function voteReply(replyId: string, value: number) {
  const auth = await getAuth();
  if (!auth) throw new Error("unauthorized");
  return castVote("reply", replyId, auth.userId, value);
}
