"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { createNotification } from "@/lib/notify";

// Staff reaction to a marketplace report: take the listing down (the seller
// can't relist it), close every open report on it, and tell the seller why.
export async function adminRemoveMarketListing(listingId: string, reason: string): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor) return;
  const why = reason.trim().slice(0, 300) || "Violates marketplace rules";
  const listing = await db.marketListing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, title: true, sellerId: true },
  });
  if (!listing) return;

  await db.$transaction([
    db.marketListing.update({
      where: { id: listingId },
      data: { status: "REMOVED", removedReason: why },
    }),
    db.report.updateMany({
      where: { marketListingId: listingId, status: "OPEN" },
      data: {
        status: "RESOLVED",
        note: `Listing removed: ${why}`,
        resolvedById: actor.id,
        resolvedAt: new Date(),
      },
    }),
  ]);
  await createNotification({
    userId: listing.sellerId,
    type: "market_removed",
    actorId: null,
    title: listing.title,
    body: why,
    url: `/market/${listing.slug}`,
  });
  revalidatePath("/[lang]/admin/reports", "page");
  revalidatePath("/[lang]/market", "layout");
}

// Put a removed listing back (e.g. after the seller fixed it).
export async function adminRestoreMarketListing(listingId: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.marketListing
    .update({
      where: { id: listingId },
      data: { status: "ACTIVE", removedReason: null, bumpedAt: new Date() },
    })
    .catch(() => {});
  revalidatePath("/[lang]/admin/reports", "page");
  revalidatePath("/[lang]/market", "layout");
}
