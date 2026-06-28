"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";

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
