"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localeHref } from "@/lib/locale-url";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { canPostIn } from "@/lib/posting-access";
import { slugify } from "@/lib/slug";
import { createNotification } from "@/lib/notify";
import { BusinessSchema, JobSchema, ReviewSchema, zodErrors, type FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";
import { deleteUploadsByUrl } from "@/lib/media";

const MAX_PHOTOS = 12;

// The gallery arrives as ordered hidden `photos` inputs. Anything that isn't a
// hosted https URL is dropped: the field only ever emits URLs our own uploader
// returned, so a stray value means someone hand-edited the form.
function parsePhotos(formData: FormData): string[] {
  return formData
    .getAll("photos")
    .map(String)
    .filter((u) => /^https:\/\//.test(u) && u.length < 500)
    .slice(0, MAX_PHOTOS);
}

async function uniqueBusinessSlug(name: string): Promise<string> {
  const base = slugify(name) || "business";
  let slug = base;
  let n = 1;
  while (await db.business.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function parseBusiness(formData: FormData) {
  return BusinessSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    tagline: formData.get("tagline") || undefined,
    description: formData.get("description") || undefined,
    state: formData.get("state"),
    city: formData.get("city") || undefined,
    website: formData.get("website") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
  });
}

// Register a new business. Who may do so is set in Admin → More.
export async function createBusiness(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!(await canPostIn("business", user))) return { message: "Registering a business isn't included in your plan." };

  const parsed = parseBusiness(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { name, city, ...rest } = parsed.data;
  const slug = await uniqueBusinessSlug(name);
  await db.business.create({
    data: { ...rest, name, city: city ?? null, slug, ownerId: user.id, photos: parsePhotos(formData) },
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business`, "page");
  await flagGaEvent("business_created");
  redirect(localeHref(`/${locale}/business/${slug}`));
}

// Edit a business — owner or admin only.
export async function updateBusiness(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const id = String(formData.get("businessId") ?? "");
  const biz = await db.business.findUnique({
    where: { id },
    select: { ownerId: true, slug: true, logoUrl: true, photos: true },
  });
  if (!biz) return { message: "Business not found." };
  if (!(await canManageBusiness(user.id, id, user.role === "ADMIN"))) return { message: "Not allowed." };

  const parsed = parseBusiness(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { name, city, ...rest } = parsed.data;
  const photos = parsePhotos(formData);
  await db.business.update({ where: { id }, data: { ...rest, name, city: city ?? null, photos } });
  if (biz.logoUrl && biz.logoUrl !== (rest.logoUrl ?? null)) await deleteUploadsByUrl([biz.logoUrl]);
  await deleteUploadsByUrl(biz.photos.filter((p) => !photos.includes(p)));

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${biz.slug}`, "page");
  return { ok: true, message: "Saved." };
}

// Delete a business — owner or admin only.
export async function deleteBusiness(businessId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, logoUrl: true, photos: true },
  });
  if (!biz || (biz.ownerId !== user.id && user.role !== "ADMIN")) return;
  await db.business.delete({ where: { id: businessId } });
  await deleteUploadsByUrl([biz.logoUrl, ...biz.photos]);
  revalidatePath(`/${locale}/business`, "page");
}

// --- Jobs ---------------------------------------------------------------
// A business the user may manage (owner, delegated manager, or admin), or null.
async function ownsBusiness(businessId: string, userId: string, isAdmin: boolean) {
  const biz = await db.business.findUnique({ where: { id: businessId }, select: { ownerId: true, slug: true } });
  if (!biz) return null;
  if (!(await canManageBusiness(userId, businessId, isAdmin))) return null;
  return biz;
}

export async function addJob(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const businessId = String(formData.get("businessId") ?? "");
  const biz = await ownsBusiness(businessId, user.id, user.role === "ADMIN");
  if (!biz) return { message: "Not allowed." };

  const parsed = JobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { title, description, city, state } = parsed.data;
  await db.jobPosting.create({
    data: { businessId, title, description, city: city ?? null, state: state ?? null },
  });
  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${biz.slug}`, "page");
  revalidatePath(`/${locale}/jobs`, "page");
  return { ok: true };
}

export async function deleteJob(jobId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const job = await db.jobPosting.findUnique({
    where: { id: jobId },
    select: { businessId: true, business: { select: { slug: true } } },
  });
  // Member-posted jobs (no business) are managed in actions/jobs.ts.
  if (!job?.businessId || !job.business) return;
  if (!(await canManageBusiness(user.id, job.businessId, user.role === "ADMIN"))) return;
  await db.jobPosting.delete({ where: { id: jobId } });
  revalidatePath(`/${locale}/business/${job.business.slug}`, "page");
  revalidatePath(`/${locale}/jobs`, "page");
}

// --- Reviews ------------------------------------------------------------
export async function submitReview(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in to review." };
  const businessId = String(formData.get("businessId") ?? "");
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, slug: true, name: true },
  });
  if (!biz) return { message: "Business not found." };
  // Owner and delegated managers can't review their own business.
  if (await canManageBusiness(user.id, businessId, false))
    return { message: "You can't review your own business." };

  const parsed = ReviewSchema.safeParse({
    rating: formData.get("rating"),
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { rating, body } = parsed.data;

  const existing = await db.businessReview.findUnique({
    where: { businessId_authorId: { businessId, authorId: user.id } },
    select: { rating: true },
  });

  await db.$transaction(async (tx) => {
    if (existing) {
      await tx.businessReview.update({
        where: { businessId_authorId: { businessId, authorId: user.id } },
        data: { rating, body: body ?? null },
      });
      await tx.business.update({
        where: { id: businessId },
        data: { ratingSum: { increment: rating - existing.rating } },
      });
    } else {
      await tx.businessReview.create({
        data: { businessId, authorId: user.id, rating, body: body ?? null },
      });
      await tx.business.update({
        where: { id: businessId },
        data: { ratingCount: { increment: 1 }, ratingSum: { increment: rating } },
      });
    }
  });

  await createNotification({
    userId: biz.ownerId,
    type: "review",
    actorId: user.id,
    title: biz.name,
    body: `${rating}★${body ? ` · ${body.slice(0, 120)}` : ""}`,
    url: `/business/${biz.slug}`,
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${biz.slug}`, "page");
  return { ok: true };
}

export async function deleteReview(reviewId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const review = await db.businessReview.findUnique({
    where: { id: reviewId },
    select: { rating: true, authorId: true, businessId: true, business: { select: { slug: true } } },
  });
  if (!review || (review.authorId !== user.id && user.role !== "ADMIN")) return;

  await db.$transaction(async (tx) => {
    await tx.businessReview.delete({ where: { id: reviewId } });
    await tx.business.update({
      where: { id: review.businessId },
      data: { ratingCount: { decrement: 1 }, ratingSum: { decrement: review.rating } },
    });
  });
  revalidatePath(`/${locale}/business/${review.business.slug}`, "page");
}

// --- Review replies (business owner/manager answering feedback) ------------
export async function replyToReview(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const reviewId = String(formData.get("reviewId") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  const review = await db.businessReview.findUnique({
    where: { id: reviewId },
    select: { businessId: true, business: { select: { slug: true } } },
  });
  if (!review) return { message: "Review not found." };
  if (!(await canManageBusiness(user.id, review.businessId, user.role === "ADMIN")))
    return { message: "Not allowed." };

  await db.businessReview.update({
    where: { id: reviewId },
    // Empty text clears the reply.
    data: { ownerReply: text || null, ownerReplyAt: text ? new Date() : null },
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${review.business.slug}`, "page");
  return { ok: true };
}

// --- Manager assignment (owner only) --------------------------------------
async function ownerOf(businessId: string, userId: string, isAdmin: boolean) {
  const biz = await db.business.findUnique({ where: { id: businessId }, select: { ownerId: true, slug: true } });
  if (!biz) return null;
  if (biz.ownerId !== userId && !isAdmin) return null;
  return biz;
}

export async function addBusinessManager(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const businessId = String(formData.get("businessId") ?? "");
  const forumName = String(formData.get("forumName") ?? "").trim();

  const biz = await ownerOf(businessId, user.id, user.role === "ADMIN");
  if (!biz) return { message: "Only the owner can manage this." };

  const target = await db.user.findUnique({ where: { forumName }, select: { id: true } });
  if (!target) return { errors: { forumName: ["No member with that forum name."] } };
  if (target.id === biz.ownerId) return { errors: { forumName: ["The owner already manages this business."] } };

  await db.businessManager.upsert({
    where: { businessId_userId: { businessId, userId: target.id } },
    update: {},
    create: { businessId, userId: target.id },
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${biz.slug}/manage`, "page");
  return { ok: true };
}

export async function removeBusinessManager(businessId: string, userId: string, locale: string): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor) return;
  const biz = await ownerOf(businessId, actor.id, actor.role === "ADMIN");
  if (!biz) return;
  await db.businessManager.delete({ where: { businessId_userId: { businessId, userId } } }).catch(() => {});
  revalidatePath(`/${locale}/business/${biz.slug}/manage`, "page");
}
