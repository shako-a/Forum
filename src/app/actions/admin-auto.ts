"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { createNotification } from "@/lib/notify";
import { deleteUploadsByUrl } from "@/lib/media";

function revalidateAuto() {
  revalidatePath("/[lang]/auto", "layout");
  revalidatePath("/[lang]/admin/auto", "page");
  revalidatePath("/[lang]/admin/reports", "page");
}

export async function setAutoFeatured(id: string, featured: boolean): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const data: { featured: boolean; featuredOrder?: number } = { featured };
  if (featured) {
    const last = await db.autoListing.aggregate({ where: { featured: true }, _max: { featuredOrder: true } });
    data.featuredOrder = (last._max.featuredOrder ?? 0) + 1;
  }
  await db.autoListing.update({ where: { id }, data }).catch(() => {});
  revalidateAuto();
}

export async function reorderAutoFeatured(ids: string[]): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.$transaction(ids.slice(0, 50).map((id, i) => db.autoListing.update({ where: { id }, data: { featuredOrder: i + 1 } })));
  revalidateAuto();
}

// Take a listing down from a report: owner can't relist; open reports close.
export async function adminRemoveAutoListing(id: string, reason: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  const why = reason.trim().slice(0, 300) || "Violates auto-market rules";
  const listing = await db.autoListing.findUnique({ where: { id }, select: { slug: true, title: true, ownerId: true } });
  if (!listing) return;
  await db.$transaction([
    db.autoListing.update({ where: { id }, data: { status: "REMOVED", removedReason: why, featured: false } }),
    db.report.updateMany({
      where: { autoListingId: id, status: "OPEN" },
      data: { status: "RESOLVED", note: `Listing removed: ${why}`, resolvedById: actor.id, resolvedAt: new Date() },
    }),
  ]);
  await createNotification({
    userId: listing.ownerId,
    type: "auto_removed",
    actorId: null,
    title: listing.title,
    body: why,
    url: `/auto/${listing.slug}`,
  });
  revalidateAuto();
}

export async function adminRestoreAutoListing(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.autoListing.update({ where: { id }, data: { status: "ACTIVE", removedReason: null } }).catch(() => {});
  revalidateAuto();
}

export async function adminDeleteAutoListing(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const listing = await db.autoListing.findUnique({ where: { id }, select: { photos: true } });
  if (!listing) return;
  await db.autoListing.delete({ where: { id } });
  await deleteUploadsByUrl(listing.photos);
  revalidateAuto();
}
