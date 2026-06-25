"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

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
