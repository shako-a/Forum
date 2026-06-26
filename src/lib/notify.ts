import { db } from "@/lib/db";

// Create a single notification. `url` is locale-less (e.g. "/p/slug"); the inbox
// prefixes the viewer's locale when linking. No-ops if there's no recipient or
// the recipient is the actor (don't notify people about their own actions).
export async function createNotification(args: {
  userId: string;
  type: string;
  actorId?: string | null;
  title: string;
  body?: string | null;
  url: string;
}): Promise<void> {
  if (!args.userId || args.userId === args.actorId) return;
  try {
    await db.notification.create({
      data: {
        userId: args.userId,
        type: args.type,
        actorId: args.actorId ?? null,
        title: args.title,
        body: args.body ?? null,
        url: args.url,
      },
    });
  } catch {
    // Notifications are best-effort — never block the primary action.
  }
}

// Parse @handle mentions from plain text and notify those members. Latin
// handles only (Georgian forum names won't match) — best-effort. Skips the
// actor and anyone already notified (e.g. the post author).
export async function notifyMentions(opts: {
  text: string;
  actorId: string;
  excludeUserIds?: string[];
  title: string;
  url: string;
}): Promise<void> {
  const handles = Array.from(
    new Set((opts.text.match(/@([A-Za-z0-9_.-]{2,30})/g) ?? []).map((s) => s.slice(1))),
  );
  if (handles.length === 0) return;
  try {
    const users = await db.user.findMany({
      where: { forumName: { in: handles } },
      select: { id: true },
    });
    const exclude = new Set([opts.actorId, ...(opts.excludeUserIds ?? [])]);
    const targets = users.filter((u) => !exclude.has(u.id));
    if (targets.length === 0) return;
    await db.notification.createMany({
      data: targets.map((u) => ({
        userId: u.id,
        type: "mention",
        actorId: opts.actorId,
        title: opts.title,
        url: opts.url,
      })),
    });
  } catch {
    // best-effort
  }
}
