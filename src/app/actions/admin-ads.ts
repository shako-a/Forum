"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { AdCardSchema, zodErrors, type FormState } from "@/lib/definitions";
import { deleteUploadsByUrl, deleteUploadById } from "@/lib/media";

// Advertisement-card management — admin only. Cards surface on the home page
// (top panel + sidebar), so mutations revalidate the whole app layout.

function parseForm(formData: FormData) {
  return AdCardSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleKa: formData.get("titleKa"),
    titleColor: (formData.get("titleColor") as string) || undefined,
    titleSize: formData.get("titleSize") || undefined,
    imageUrl: (formData.get("imageUrl") as string) ?? "",
    videoUrl: (formData.get("videoUrl") as string) ?? "",
    linkUrl: (formData.get("linkUrl") as string) ?? "",
    placement: formData.get("placement"),
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

export async function createAdCard(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "Unauthorized." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { titleEn, titleKa, titleColor, titleSize, imageUrl, videoUrl, linkUrl, placement, active, sortOrder } =
    parsed.data;

  await db.adCard.create({
    data: {
      titleEn,
      titleKa,
      titleColor: titleColor ?? "#ffffff",
      titleSize: titleSize ?? 16,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      linkUrl: linkUrl || null,
      placement,
      active: active ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAdCard(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "Unauthorized." };

  const id = String(formData.get("id") ?? "");
  const exists = await db.adCard.findUnique({
    where: { id },
    select: { id: true, imageUrl: true, videoUrl: true },
  });
  if (!exists) return { message: "Ad card not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { titleEn, titleKa, titleColor, titleSize, imageUrl, videoUrl, linkUrl, placement, active, sortOrder } =
    parsed.data;

  // Media swapped out of the card is released from storage.
  const dropped = [exists.imageUrl, exists.videoUrl].filter(
    (u) => u && u !== (imageUrl || null) && u !== (videoUrl || null),
  );
  await db.adCard.update({
    where: { id },
    data: {
      titleEn,
      titleKa,
      titleColor: titleColor ?? "#ffffff",
      titleSize: titleSize ?? 16,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      linkUrl: linkUrl || null,
      placement,
      active: active ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });
  await deleteUploadsByUrl(dropped);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAdCard(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const card = await db.adCard.findUnique({ where: { id }, select: { imageUrl: true, videoUrl: true } });
  await db.adCard.delete({ where: { id } }).catch(() => {});
  if (card) await deleteUploadsByUrl([card.imageUrl, card.videoUrl]);
  revalidatePath("/", "layout");
}

/** Remove one upload from storage and the ledger (admin "Uploads" panel). */
export async function adminDeleteUpload(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await deleteUploadById(id);
  revalidatePath("/", "layout");
}

/** Toggle a card's visibility on the home page without opening the editor. */
export async function toggleAdCard(id: string, active: boolean): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.adCard.update({ where: { id }, data: { active } }).catch(() => {});
  revalidatePath("/", "layout");
}
