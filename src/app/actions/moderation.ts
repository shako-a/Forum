"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, canModerateCategory } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";

// Moderation actions. Each is reachable via direct POST, so authorization is
// re-checked here (category-scoped: a moderator may only act in categories
// they're assigned to; admins act everywhere). All are no-ops when the caller
// lacks permission rather than throwing, so a stale UI button just does nothing.

function safeLocale(locale: string): string {
  return isLocale(locale) ? locale : defaultLocale;
}

/** Hide or unhide a post. Moderator (of the post's category) or admin only. */
export async function setPostHidden(
  postId: string,
  hidden: boolean,
  locale: string,
  slug: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, categoryId: true },
  });
  if (!post) return;
  if (!(await canModerateCategory(user, post.categoryId))) return;

  await db.post.update({
    where: { id: post.id },
    data: hidden
      ? { hidden: true, hiddenById: user.id, hiddenAt: new Date() }
      : { hidden: false, hiddenById: null, hiddenAt: null },
  });

  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/p/${slug}`);
  revalidatePath(`/${lang}`);
}

/** Hide or unhide a single reply. Moderator (of the post's category) or admin only. */
export async function setReplyHidden(
  replyId: string,
  hidden: boolean,
  locale: string,
  slug: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: { id: true, post: { select: { categoryId: true } } },
  });
  if (!reply) return;
  if (!(await canModerateCategory(user, reply.post.categoryId))) return;

  await db.reply.update({
    where: { id: reply.id },
    data: hidden
      ? { hidden: true, hiddenById: user.id, hiddenAt: new Date() }
      : { hidden: false, hiddenById: null, hiddenAt: null },
  });

  revalidatePath(`/${safeLocale(locale)}/p/${slug}`);
}

/** Lock or unlock replies on a post. Moderator (of the post's category) or admin only. */
export async function setRepliesLocked(
  postId: string,
  locked: boolean,
  locale: string,
  slug: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, categoryId: true },
  });
  if (!post) return;
  if (!(await canModerateCategory(user, post.categoryId))) return;

  await db.post.update({ where: { id: post.id }, data: { repliesLocked: locked } });
  revalidatePath(`/${safeLocale(locale)}/p/${slug}`);
}
