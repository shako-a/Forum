"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";

// Admin: total items shown in the Popular Topics bar (posts + ads). Clamped 1–20.
export async function setPopularBarSize(size: number): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  const n = Math.max(1, Math.min(20, Math.round(Number(size) || 6)));
  await db.siteSetting.upsert({
    where: { id: "singleton" },
    update: { popularBarSize: n },
    create: { id: "singleton", popularBarSize: n },
  });
  revalidatePath("/[lang]", "page");
  revalidatePath("/[lang]/admin/popular", "page");
}

// Admin: pin/unpin a post into the Popular Topics bar.
export async function setFeaturedInBar(postId: string, featured: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  await db.post.update({ where: { id: postId }, data: { featuredInBar: featured } });
  revalidatePath("/[lang]", "page");
  revalidatePath("/[lang]/admin/popular", "page");
}
