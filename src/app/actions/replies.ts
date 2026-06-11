"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, roleAtLeast } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";
import { buildReplyDoc, safeUrl } from "@/lib/prosemirror";
import type { FormState } from "@/lib/definitions";

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

export async function createReply(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in to reply." };

  const locale = localeFrom(formData);
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const parentId = (formData.get("parentId") as string) || null;
  const text = String(formData.get("body") ?? "").trim();
  const image = safeUrl(formData.get("image"));

  if (!text && !image) return { errors: { body: ["Please write a reply or attach an image."] } };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, repliesLocked: true },
  });
  if (!post) return { message: "Post not found." };

  // Moderators can still reply to a locked thread.
  if (post.repliesLocked && !roleAtLeast(user.role, "MODERATOR")) {
    return { message: "Replies are locked on this post." };
  }

  // A nested reply's parent must belong to this post.
  if (parentId) {
    const parent = await db.reply.findUnique({ where: { id: parentId }, select: { postId: true } });
    if (!parent || parent.postId !== postId) {
      return { message: "Invalid reply target." };
    }
  }

  await db.$transaction([
    db.reply.create({
      data: {
        postId,
        parentId,
        authorId: user.id,
        body: buildReplyDoc(text, image) as unknown as Prisma.InputJsonValue,
      },
    }),
    db.post.update({ where: { id: postId }, data: { lastActivity: new Date() } }),
  ]);

  revalidatePath(`/${locale}/p/${slug}`);
  return { ok: true };
}

// Edit a reply. Allowed for the author or a moderator+ (per spec, mods may edit).
export async function editReply(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const locale = localeFrom(formData);
  const slug = String(formData.get("slug") ?? "");
  const replyId = String(formData.get("replyId") ?? "");
  const text = String(formData.get("body") ?? "").trim();
  const image = safeUrl(formData.get("image"));

  if (!text && !image) return { errors: { body: ["Please write a reply or attach an image."] } };

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: { authorId: true, deletedAt: true },
  });
  if (!reply || reply.deletedAt) return { message: "Reply not found." };

  const canEdit = reply.authorId === user.id || roleAtLeast(user.role, "MODERATOR");
  if (!canEdit) return { message: "You can only edit your own replies." };

  await db.reply.update({
    where: { id: replyId },
    data: { body: buildReplyDoc(text, image) as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/${locale}/p/${slug}`);
  return { ok: true };
}

// Delete your own reply (mods may delete too). Replies with children become a
// "[deleted]" tombstone so the sub-thread is preserved; leaf replies are removed.
export async function deleteReply(replyId: string, locale: string, slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: { authorId: true, deletedAt: true, _count: { select: { children: true } } },
  });
  if (!reply || reply.deletedAt) return;

  const canDelete = reply.authorId === user.id || roleAtLeast(user.role, "MODERATOR");
  if (!canDelete) return;

  if (reply._count.children > 0) {
    await db.reply.update({
      where: { id: replyId },
      data: { deletedAt: new Date(), body: { type: "doc", content: [] } },
    });
  } else {
    await db.reply.delete({ where: { id: replyId } });
  }

  const lang = isLocale(locale) ? locale : defaultLocale;
  revalidatePath(`/${lang}/p/${slug}`);
}
