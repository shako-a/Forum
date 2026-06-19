"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { ProfileFormSchema, zodErrors, type FormState } from "@/lib/definitions";

// Edit the signed-in user's own profile. Reachable via direct POST, so it
// re-checks auth server-side and only ever mutates the caller's own row.
export async function updateProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const parsed = ProfileFormSchema.safeParse({
    email: formData.get("email"),
    forumName: formData.get("forumName"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    city: formData.get("city") || undefined,
    hideRealName: formData.get("hideRealName") === "on",
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { email, forumName, city, ...rest } = parsed.data;

  // Friendly errors on the unique fields before hitting the DB constraint —
  // ignore rows belonging to the current user (unchanged values are fine).
  const [emailOwner, nameOwner] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.findUnique({ where: { forumName }, select: { id: true } }),
  ]);
  if (emailOwner && emailOwner.id !== user.id)
    return { errors: { email: ["An account with this email already exists."] } };
  if (nameOwner && nameOwner.id !== user.id)
    return { errors: { forumName: ["This forum name is taken."] } };

  await db.user.update({
    where: { id: user.id },
    data: { email, forumName, city: city ?? null, ...rest },
  });

  // The profile URL is keyed by forumName, so refresh both the old and new ones.
  revalidatePath("/[lang]/account", "page");
  revalidatePath("/[lang]/u/[forumName]", "page");

  return { ok: true, message: "Saved." };
}
