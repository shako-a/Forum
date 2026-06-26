"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, authorize } from "@/lib/dal";
import { isBlockedBetween } from "@/lib/inbox-data";
import type { FormState } from "@/lib/definitions";

// Find or create a 1:1 conversation with another user, then open it.
export async function startConversation(otherUserId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || otherUserId === user.id) return;
  const other = await db.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!other) return;

  const existing = await db.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: other.id } } },
      ],
    },
    select: { id: true },
  });

  // If blocked (either way), let them open an existing thread (to view history /
  // unblock) but don't start a brand-new conversation.
  if (await isBlockedBetween(user.id, other.id)) {
    redirect(existing ? `/${locale}/inbox/${existing.id}` : `/${locale}/inbox`);
  }

  let id = existing?.id;
  if (!id) {
    const convo = await db.conversation.create({
      data: { participants: { create: [{ userId: user.id }, { userId: other.id }] } },
      select: { id: true },
    });
    id = convo.id;
  }
  redirect(`/${locale}/inbox/${id}`);
}

export async function sendMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { errors: { body: ["Write a message."] } };

  const part = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!part) return { message: "Not allowed." };

  // Can't send if there's a block in either direction.
  const others = await db.conversationParticipant.findMany({
    where: { conversationId, userId: { not: user.id } },
    select: { userId: true },
  });
  const otherId = others[0]?.userId;
  if (otherId && (await isBlockedBetween(user.id, otherId))) {
    return { message: "You can't message this person." };
  }

  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/inbox/${conversationId}`);
  revalidatePath(`/${locale}/inbox`);
  return { ok: true };
}

export async function markConversationRead(conversationId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.conversationParticipant.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  });
  revalidatePath(`/${locale}/inbox`);
}

export async function markNotificationsRead(locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath(`/${locale}/inbox`);
}

// --- Block / report ------------------------------------------------------
export async function blockUser(otherUserId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || otherUserId === user.id) return;
  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: otherUserId } },
    update: {},
    create: { blockerId: user.id, blockedId: otherUserId },
  });
  revalidatePath(`/${locale}/inbox`);
}

export async function unblockUser(otherUserId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.block
    .delete({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: otherUserId } } })
    .catch(() => {});
  revalidatePath(`/${locale}/inbox`);
}

export async function reportUser(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const reportedUserId = String(formData.get("reportedUserId") ?? "");
  if (!reportedUserId || reportedUserId === user.id) return { message: "Invalid report." };
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const conversationId = String(formData.get("conversationId") ?? "") || null;

  // Snapshot the other person's latest message in this thread, for context.
  let context: string | null = null;
  if (conversationId) {
    const last = await db.message.findFirst({
      where: { conversationId, senderId: reportedUserId },
      orderBy: { createdAt: "desc" },
      select: { body: true },
    });
    context = last?.body.slice(0, 280) ?? null;
  }

  await db.report.create({
    data: { reporterId: user.id, reportedUserId, conversationId, reason, context },
  });
  return { ok: true };
}

// Admin: mark a report resolved.
export async function resolveReport(reportId: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.report.update({ where: { id: reportId }, data: { status: "RESOLVED" } });
  revalidatePath("/[lang]/admin/reports", "page");
}
