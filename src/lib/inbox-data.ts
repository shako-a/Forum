import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

// Unread totals for the nav badge. Cached per request so Header and BottomNav
// share one query. "messages" = conversations whose latest message is incoming
// and newer than when the viewer last read it.
export const getInboxUnread = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return { total: 0, notifications: 0, messages: 0 };

  const [notifications, parts] = await Promise.all([
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.conversationParticipant.findMany({
      where: { userId: user.id },
      select: {
        lastReadAt: true,
        conversation: {
          select: {
            lastMessageAt: true,
            messages: { take: 1, orderBy: { createdAt: "desc" }, select: { senderId: true } },
          },
        },
      },
    }),
  ]);

  const messages = parts.filter((p) => {
    const last = p.conversation.messages[0];
    if (!last || last.senderId === user.id) return false;
    return !p.lastReadAt || p.lastReadAt < p.conversation.lastMessageAt;
  }).length;

  return { total: notifications + messages, notifications, messages };
});

export async function getNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { forumName: true } } },
  });
}

export async function getConversations(userId: string) {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { body: true, senderId: true },
          },
          participants: {
            where: { userId: { not: userId } },
            select: { user: { select: { forumName: true } } },
          },
        },
      },
    },
  });

  return parts.map((p) => {
    const c = p.conversation;
    const last = c.messages[0] ?? null;
    const unread = !!last && last.senderId !== userId && (!p.lastReadAt || p.lastReadAt < c.lastMessageAt);
    return {
      id: c.id,
      other: c.participants[0]?.user.forumName ?? "?",
      lastBody: last?.body ?? "",
      fromSelf: last?.senderId === userId,
      lastAt: c.lastMessageAt,
      unread,
    };
  });
}

// A single conversation thread — only if the viewer is a participant.
export async function getConversation(conversationId: string, userId: string) {
  const part = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { conversationId: true },
  });
  if (!part) return null;

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        where: { userId: { not: userId } },
        select: { user: { select: { id: true, forumName: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, body: true, senderId: true, createdAt: true },
      },
    },
  });
  if (!convo) return null;
  return {
    id: convo.id,
    otherId: convo.participants[0]?.user.id ?? "",
    other: convo.participants[0]?.user.forumName ?? "?",
    messages: convo.messages,
  };
}

// Is there a block in EITHER direction between two users?
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  return !!block;
}

// Directional block state between the viewer and another user.
export async function getBlockState(viewerId: string, otherId: string) {
  const blocks = await db.block.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: otherId },
        { blockerId: otherId, blockedId: viewerId },
      ],
    },
    select: { blockerId: true },
  });
  return {
    iBlocked: blocks.some((b) => b.blockerId === viewerId),
    theyBlocked: blocks.some((b) => b.blockerId === otherId),
  };
}
