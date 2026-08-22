"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { slugify } from "@/lib/slug";
import { BusinessSchema, zodErrors, type FormState } from "@/lib/definitions";

async function uniqueBusinessSlug(name: string): Promise<string> {
  const base = slugify(name) || "business";
  let slug = base;
  let n = 1;
  while (await db.business.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// Admin creates a directory listing directly, bypassing the Professional-tier
// gate the public form enforces. Only name, category and location are required;
// the owner defaults to the acting admin unless a member's forum name is given.
export async function adminCreateBusiness(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await authorize("ADMIN");
  if (!actor) return { message: "You do not have permission to do this." };

  const parsed = BusinessSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    state: formData.get("state"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  // Owner: blank → the admin; otherwise look up the named member.
  const ownerName = String(formData.get("ownerForumName") ?? "").trim();
  let ownerId = actor.id;
  if (ownerName) {
    const owner = await db.user.findUnique({ where: { forumName: ownerName }, select: { id: true } });
    if (!owner) return { errors: { ownerForumName: ["No member with that forum name."] } };
    ownerId = owner.id;
  }

  const { name, category, state } = parsed.data;
  const slug = await uniqueBusinessSlug(name);
  await db.business.create({ data: { name, category, state, slug, ownerId } });

  revalidatePath("/[lang]/admin/businesses", "page");
  return { ok: true, message: "Business created." };
}

// Admin: mark a business as verified (authentic) or featured (promoted —
// pinned to the top of the directory).
export async function setBusinessVerified(id: string, verified: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.business.update({ where: { id }, data: { verified } });
  revalidatePath("/[lang]/admin/businesses", "page");
}

export async function setBusinessFeatured(id: string, featured: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.business.update({ where: { id }, data: { featured } });
  revalidatePath("/[lang]/admin/businesses", "page");
}

// Admin: permanently delete a business (cascades reviews + jobs).
export async function removeBusiness(id: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.business.delete({ where: { id } }).catch(() => {});
  revalidatePath("/[lang]/admin/businesses", "page");
}

// Admin: show/hide a job posting (toggle active) or remove it entirely.
export async function setJobActive(id: string, active: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.jobPosting.update({ where: { id }, data: { active } });
  revalidatePath("/[lang]/admin/jobs", "page");
}

export async function removeJob(id: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.jobPosting.delete({ where: { id } });
  revalidatePath("/[lang]/admin/jobs", "page");
}
