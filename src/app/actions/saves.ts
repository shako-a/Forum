"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

// Toggle whether the current user has saved (bookmarked) a post.
export async function toggleSave(postId: string): Promise<{ saved: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { saved: false };

  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await db.savedPost.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await db.savedPost.delete({ where: key });
    return { saved: false };
  }
  await db.savedPost.create({ data: { userId: user.id, postId } });
  return { saved: true };
}
