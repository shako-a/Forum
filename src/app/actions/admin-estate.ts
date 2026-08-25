"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { createNotification } from "@/lib/notify";
import { deleteUploadsByUrl } from "@/lib/media";

function revalidateEstate() {
  revalidatePath("/[lang]/realestate", "layout");
  revalidatePath("/[lang]/admin/estate", "page");
  revalidatePath("/[lang]/admin/reports", "page");
}

// Banner curation: feature / unfeature, with an explicit position.
export async function setEstateFeatured(id: string, featured: boolean, order?: number): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const data: { featured: boolean; featuredOrder?: number } = { featured };
  if (featured) {
    if (order !== undefined) data.featuredOrder = Math.max(0, Math.floor(order));
    else {
      const last = await db.propertyListing.aggregate({ where: { featured: true }, _max: { featuredOrder: true } });
      data.featuredOrder = (last._max.featuredOrder ?? 0) + 1;
    }
  }
  await db.propertyListing.update({ where: { id }, data }).catch(() => {});
  revalidateEstate();
}

// Reorder the banner: ids in the desired order.
export async function reorderEstateFeatured(ids: string[]): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.$transaction(
    ids.slice(0, 50).map((id, i) => db.propertyListing.update({ where: { id }, data: { featuredOrder: i + 1 } })),
  );
  revalidateEstate();
}

// Unlist (hide from the directory) or relist; the owner is told when staff
// unlists with a reason.
export async function setEstateActive(id: string, active: boolean, reason?: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  const listing = await db.propertyListing.findUnique({ where: { id }, select: { ownerId: true, slug: true, title: true } });
  if (!listing) return;
  await db.propertyListing.update({ where: { id }, data: { active, ...(active ? {} : { featured: false }) } });
  if (!active) {
    await db.report.updateMany({
      where: { propertyListingId: id, status: "OPEN" },
      data: { status: "RESOLVED", note: `Listing unlisted: ${reason?.trim() || "by staff"}`, resolvedById: actor.id, resolvedAt: new Date() },
    });
    await createNotification({
      userId: listing.ownerId,
      type: "estate_unlisted",
      actorId: null,
      title: listing.title,
      body: reason?.trim().slice(0, 300) || null,
      url: `/realestate/${listing.slug}`,
    });
  }
  revalidateEstate();
}

export async function adminDeleteEstateListing(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const listing = await db.propertyListing.findUnique({ where: { id }, select: { photos: true } });
  if (!listing) return;
  await db.propertyListing.delete({ where: { id } });
  await deleteUploadsByUrl(listing.photos);
  revalidateEstate();
}
