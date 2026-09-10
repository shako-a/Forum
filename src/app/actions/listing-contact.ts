"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { isBlockedBetween } from "@/lib/inbox-data";
import { createNotification } from "@/lib/notify";
import { isInteractionKind, isModuleKey, type ContactTarget, type InteractionKind } from "@/lib/modules";
import { recordInteraction, resolveListingTarget } from "@/lib/listing-interactions";

// Contact actions on a module listing. Both entry points take only the
// (module, id) pair from the client and re-resolve everything else from the
// row — see resolveListingTarget for why.

/** An outbound button was pressed (call, WhatsApp, website…). Fire-and-forget from the client. */
export async function trackListingInteraction(target: ContactTarget, kind: InteractionKind): Promise<void> {
  if (!target || !isModuleKey(target.module) || typeof target.listingId !== "string") return;
  if (!isInteractionKind(kind) || kind === "message") return; // messages are recorded when sent
  const t = await resolveListingTarget(target.module, target.listingId);
  if (!t) return;
  const user = await getCurrentUser();
  if (user && user.id === t.recipientId) return; // an owner pressing their own buttons isn't a lead
  await recordInteraction(t, kind, user?.id ?? null);
}

export type SendMessageState =
  | { ok?: boolean; message?: string; errors?: Record<string, string[]>; conversationId?: string }
  | undefined;

/**
 * "Message the business" — delivered through the forum inbox, into the same
 * 1:1 thread the two members would have anyway, so the reply lands where the
 * owner already looks and the usual block/report tools apply.
 */
export async function sendListingMessage(_state: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const mod = String(formData.get("module") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!isModuleKey(mod) || !listingId) return { message: "Invalid listing." };
  if (body.length < 2) return { errors: { body: ["Write a message."] } };

  const t = await resolveListingTarget(mod, listingId);
  if (!t) return { message: "Listing not found." };
  if (!t.recipientId) return { message: "This listing has no one to message." };
  if (t.recipientId === user.id) return { message: "This is your own listing." };
  if (await isBlockedBetween(user.id, t.recipientId)) return { message: "You can't message this person." };

  const existing = await db.conversation.findFirst({
    where: {
      AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: t.recipientId } } }],
    },
    select: { id: true },
  });
  const conversationId =
    existing?.id ??
    (
      await db.conversation.create({
        data: { participants: { create: [{ userId: user.id }, { userId: t.recipientId }] } },
        select: { id: true },
      })
    ).id;

  // Lead with the listing so the recipient knows what it's about — the inbox
  // attaches posts this way, but listings aren't posts.
  const text = `📌 ${t.listingTitle}\n${body}`;
  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body: text } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  await recordInteraction(t, "message", user.id, { conversationId, body: body.slice(0, 280) });
  await createNotification({
    userId: t.recipientId,
    type: "message",
    actorId: user.id,
    title: t.listingTitle,
    body: body.slice(0, 120),
    url: `/inbox/${conversationId}`,
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/inbox`);
  return { ok: true, conversationId };
}
