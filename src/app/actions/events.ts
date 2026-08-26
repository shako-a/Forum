"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma, type RsvpStatus } from "@/generated/prisma/client";
import { getCurrentUser, canModerateCategory } from "@/lib/dal";
import { canCreateEvents } from "@/lib/event-access";
import { defaultLocale, isLocale } from "@/i18n/config";
import { pmHasContent, pmValidate, safeImageUrl, appendImage } from "@/lib/prosemirror";
import { parseEventDateTime, isRsvpStatus } from "@/lib/events";
import { slugify } from "@/lib/slug";
import { EventSchema, zodErrors, type FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";
import { getActingBusiness } from "@/lib/acting-as";

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "event";
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const exists = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// The event-only fields, shared by create and edit.
function readEventFields(formData: FormData) {
  return EventSchema.safeParse({
    title: formData.get("title"),
    categoryId: formData.get("categoryId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    location: formData.get("location") || undefined,
    url: formData.get("url") || undefined,
  });
}

// The rich-text body, with the same size/depth guards a normal post gets.
function readBody(formData: FormData): { body: unknown; error?: string } {
  const raw = String(formData.get("body") ?? "");
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const check = body === null ? { ok: true } : pmValidate(body, raw.length);
  if (!check.ok) return { body: null, error: "The description is too large or too deeply nested." };
  return { body };
}

export async function createEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/events/new`);

  // Re-checked here, not just on the page: a server action is reachable by a
  // direct POST, so the gate has to hold at the point of the write.
  if (!(await canCreateEvents(user))) {
    return { message: "You do not have permission to create events." };
  }

  const parsed = readEventFields(formData);
  const { body, error: bodyError } = readBody(formData);
  const imageUrl = safeImageUrl(formData.get("image"));

  const errors: Record<string, string[]> = parsed.success ? {} : zodErrors(parsed.error);
  if (bodyError) errors.body = [bodyError];
  else if (!pmHasContent(body) && !imageUrl) errors.body = ["Please describe the event or add an image."];
  if (Object.keys(errors).length || !parsed.success) return { errors };

  const startsAt = parseEventDateTime(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? parseEventDateTime(parsed.data.endsAt) : null;
  if (!startsAt) return { errors: { startsAt: ["Please set a valid start date and time."] } };

  const category = await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
  if (!category) return { errors: { categoryId: ["Category not found."] } };

  const finalBody = imageUrl ? appendImage(body, imageUrl) : body;
  const slug = await uniqueSlug(parsed.data.title);
  const acting = await getActingBusiness();

  await db.post.create({
    data: {
      kind: "EVENT",
      slug,
      title: parsed.data.title,
      body: finalBody as Prisma.InputJsonValue,
      categoryId: category.id,
      authorId: user.id,
      // Events carry a real organiser by design — you can't RSVP to a stranger.
      // Business authorship is kept (a business hosting an event is normal).
      anonAlias: null,
      authorBusinessId: acting?.id ?? null,
      eventStartsAt: startsAt,
      eventEndsAt: endsAt,
      eventLocation: parsed.data.location ?? null,
      eventUrl: parsed.data.url || null,
      lastActivity: new Date(),
    },
  });

  await flagGaEvent("event_created");
  redirect(`/${locale}/p/${slug}`);
}

export async function editEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const postId = String(formData.get("postId") ?? "");
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, authorId: true, categoryId: true, kind: true },
  });
  if (!post || post.kind !== "EVENT") return { message: "Event not found." };

  const canEdit = post.authorId === user.id || (await canModerateCategory(user, post.categoryId));
  if (!canEdit) return { message: "You can't edit this event." };

  const parsed = readEventFields(formData);
  const { body, error: bodyError } = readBody(formData);
  const imageUrl = safeImageUrl(formData.get("image"));

  const errors: Record<string, string[]> = parsed.success ? {} : zodErrors(parsed.error);
  if (bodyError) errors.body = [bodyError];
  else if (!pmHasContent(body) && !imageUrl) errors.body = ["Please describe the event or add an image."];
  if (Object.keys(errors).length || !parsed.success) return { errors };

  const startsAt = parseEventDateTime(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? parseEventDateTime(parsed.data.endsAt) : null;
  if (!startsAt) return { errors: { startsAt: ["Please set a valid start date and time."] } };

  const category = await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
  if (!category) return { errors: { categoryId: ["Category not found."] } };

  const finalBody = imageUrl ? appendImage(body, imageUrl) : body;
  await db.post.update({
    where: { id: post.id },
    data: {
      title: parsed.data.title,
      body: finalBody as Prisma.InputJsonValue,
      categoryId: category.id,
      eventStartsAt: startsAt,
      eventEndsAt: endsAt,
      eventLocation: parsed.data.location ?? null,
      eventUrl: parsed.data.url || null,
    },
  });

  revalidatePath(`/${locale}/p/${post.slug}`);
  revalidatePath(`/${locale}/events`);
  redirect(`/${locale}/p/${post.slug}`);
}

export type RsvpResult = { going: number; interested: number; notGoing: number; mine: RsvpStatus | null };

/**
 * Set (or clear) the current member's answer to an event. Clicking the answer
 * you already gave takes it back, so there's always a way to undo without a
 * separate control. Returns fresh counts for the optimistic UI to settle on.
 */
export async function setRsvp(postId: string, status: string): Promise<RsvpResult> {
  const user = await getCurrentUser();
  const empty: RsvpResult = { going: 0, interested: 0, notGoing: 0, mine: null };
  if (!user || !isRsvpStatus(status)) return empty;

  const event = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, kind: true, hidden: true },
  });
  if (!event || event.kind !== "EVENT" || event.hidden) return empty;

  const key = { postId_userId: { postId, userId: user.id } };
  const existing = await db.eventRsvp.findUnique({ where: key, select: { status: true } });

  if (existing?.status === status) {
    await db.eventRsvp.delete({ where: key });
  } else {
    await db.eventRsvp.upsert({
      where: key,
      create: { postId, userId: user.id, status },
      update: { status },
    });
  }
  return rsvpResult(postId, user.id);
}

async function rsvpResult(postId: string, userId: string): Promise<RsvpResult> {
  const [grouped, mine] = await Promise.all([
    db.eventRsvp.groupBy({ by: ["status"], where: { postId }, _count: { _all: true } }),
    db.eventRsvp.findUnique({ where: { postId_userId: { postId, userId } }, select: { status: true } }),
  ]);
  const at = (s: RsvpStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  return { going: at("GOING"), interested: at("INTERESTED"), notGoing: at("NOT_GOING"), mine: mine?.status ?? null };
}
