"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canRegisterBusiness } from "@/lib/perks";
import { slugify } from "@/lib/slug";
import { createNotification } from "@/lib/notify";
import { BusinessSchema, JobSchema, ReviewSchema, zodErrors, type FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";

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

// Register a new business — Professional tier only.
export async function createBusiness(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!canRegisterBusiness(user)) return { message: "Business accounts require the Professional tier." };

  const parsed = parseBusiness(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { name, city, ...rest } = parsed.data;
  const slug = await uniqueBusinessSlug(name);
  await db.business.create({
    data: { ...rest, name, city: city ?? null, slug, ownerId: user.id },
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business`, "page");
  await flagGaEvent("business_created");
  redirect(`/${locale}/business/${slug}`);
}

// Edit a business — owner or admin only.
export async function updateBusiness(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const id = String(formData.get("businessId") ?? "");
  const biz = await db.business.findUnique({ where: { id }, select: { ownerId: true, slug: true } });
  if (!biz) return { message: "Business not found." };
  if (biz.ownerId !== user.id && user.role !== "ADMIN") return { message: "Not allowed." };

  const parsed = parseBusiness(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { name, city, ...rest } = parsed.data;
  await db.business.update({ where: { id }, data: { ...rest, name, city: city ?? null } });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/business/${biz.slug}`, "page");
  return { ok: true, message: "Saved." };
}

// Delete a business — owner or admin only.
export async function deleteBusiness(businessId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const biz = await db.business.findUnique({ where: { id: businessId }, select: { ownerId: true } });
  if (!biz || (biz.ownerId !== user.id && user.role !== "ADMIN")) return;
  await db.business.delete({ where: { id: businessId } });
  revalidatePath(`/${locale}/business`, "page");
}

// --- Jobs ---------------------------------------------------------------
async function ownsBusiness(businessId: string, userId: string, isAdmin: boolean) {
  const biz = await db.business.findUnique({ where: { id: businessId }, select: { ownerId: true, slug: true } });
  if (!biz) return null;
  if (biz.ownerId !== userId && !isAdmin) return null;
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
    select: { business: { select: { ownerId: true, slug: true } } },
  });
  if (!job || (job.business.ownerId !== user.id && user.role !== "ADMIN")) return;
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
  if (biz.ownerId === user.id) return { message: "You can't review your own business." };

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
