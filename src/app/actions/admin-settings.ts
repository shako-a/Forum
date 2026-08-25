"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, authorize } from "@/lib/dal";
import { isPostingArea, isPostingMode, type PostingArea, type PostingMode } from "@/lib/posting-access";

// Owner-only: control whether other admins/moderators can de-anonymize content.
export async function setRevealAnonymousToStaff(enabled: boolean): Promise<void> {
  const me = await getCurrentUser();
  if (!me?.isOwner) return; // only the main admin (owner) may change this

  await db.siteSetting.upsert({
    where: { id: "singleton" },
    update: { revealAnonymousToStaff: enabled },
    create: { id: "singleton", revealAnonymousToStaff: enabled },
  });
  revalidatePath("/[lang]/admin", "page");
}

// Admin: who may post in a listing area — every member, or perk holders only.
export async function setPostingAccess(area: PostingArea, mode: PostingMode): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  if (!isPostingArea(area) || !isPostingMode(mode)) return;
  const column = { estate: "postingEstate", market: "postingMarket", auto: "postingAuto", jobs: "postingJobs" }[area];
  await db.siteSetting.upsert({
    where: { id: "singleton" },
    update: { [column]: mode },
    create: { id: "singleton", [column]: mode },
  });
  revalidatePath("/[lang]/admin/more", "page");
  revalidatePath("/[lang]", "layout");
}
