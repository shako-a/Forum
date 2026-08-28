"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FEED_KIND_FILTER } from "@/lib/post-kinds";
import { getCurrentUser, authorize } from "@/lib/dal";
import { isBlockedBetween } from "@/lib/inbox-data";
import { pmPlainText } from "@/lib/prosemirror";
import type { FormState } from "@/lib/definitions";

// Find or create a 1:1 conversation with another user, then open it. An
// optional postId is carried through as ?attach= so the composer pre-attaches
// that post ("Text the Author" about a specific listing).
export async function startConversation(
  otherUserId: string,
  locale: string,
  postId?: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || otherUserId === user.id) return;
  const other = await db.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!other) return;
  const attach = postId ? `?attach=${postId}` : "";

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
  redirect(`/${locale}/inbox/${id}${attach}`);
}

// Title search for the "attach a post" picker in the DM composer.
export async function searchPosts(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const posts = await db.post.findMany({
    where: { hidden: false, ...FEED_KIND_FILTER, title: { contains: q, mode: "insensitive" } },
    orderBy: { lastActivity: "desc" },
    take: 8,
    select: { id: true, slug: true, title: true, category: { select: { slug: true } } },
  });
  return posts.map((p) => ({ id: p.id, slug: p.slug, title: p.title, categorySlug: p.category.slug }));
}

export async function sendMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const postId = String(formData.get("postId") ?? "") || null;
  // A message must have text or an attached post.
  if (!body && !postId) return { errors: { body: ["Write a message."] } };

  // Validate the referenced post exists (and isn't hidden).
  let validPostId: string | null = null;
  if (postId) {
    const p = await db.post.findFirst({ where: { id: postId, hidden: false, ...FEED_KIND_FILTER }, select: { id: true } });
    validPostId = p?.id ?? null;
  }

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
    db.message.create({ data: { conversationId, senderId: user.id, body, postId: validPostId } }),
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

// Report a post or a reply (გასაჩივრება). Snapshots the content for the admin
// Reports panel and records who authored it. Ignores duplicate open reports.
export async function reportContent(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const postId = String(formData.get("postId") ?? "") || null;
  const replyId = String(formData.get("replyId") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!postId && !replyId) return { message: "Invalid report." };

  let reportedUserId: string | null = null;
  let context: string | null = null;

  if (replyId) {
    const reply = await db.reply.findUnique({
      where: { id: replyId },
      select: { authorId: true, body: true },
    });
    if (!reply) return { message: "Not found." };
    reportedUserId = reply.authorId;
    context = pmPlainText(reply.body).slice(0, 280) || null;
  } else if (postId) {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, title: true, body: true },
    });
    if (!post) return { message: "Not found." };
    reportedUserId = post.authorId;
    context = `${post.title} — ${pmPlainText(post.body)}`.slice(0, 280) || null;
  }

  if (reportedUserId === user.id) return { message: "You can't report your own content." };

  // Don't stack duplicate open reports from the same user for the same content.
  const dupe = await db.report.findFirst({
    where: { reporterId: user.id, postId, replyId, status: "OPEN" },
    select: { id: true },
  });
  if (dupe) return { ok: true };

  await db.report.create({
    data: { reporterId: user.id, reportedUserId, postId, replyId, reason, context },
  });
  return { ok: true };
}

// Admin: close a report as resolved (acted on) or dismissed (no action
// needed), with an optional note for the record.
export async function resolveReport(reportId: string, note?: string): Promise<void> {
  await closeReport(reportId, "RESOLVED", note);
}
export async function dismissReport(reportId: string, note?: string): Promise<void> {
  await closeReport(reportId, "DISMISSED", note);
}
async function closeReport(reportId: string, status: "RESOLVED" | "DISMISSED", note?: string) {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.report.update({
    where: { id: reportId },
    data: {
      status,
      note: (note ?? "").trim().slice(0, 500) || null,
      resolvedById: actor.id,
      resolvedAt: new Date(),
    },
  });
  revalidatePath("/[lang]/admin/reports", "page");
}
