"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canPostListing } from "@/lib/perks";
import { slugify } from "@/lib/slug";
import { isEstateFeature, isEstateReportReason } from "@/lib/estate";
import { ListingSchema, zodErrors, type FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";
import { deleteUploadsByUrl } from "@/lib/media";
import { lookupZip } from "@/lib/geo";

const MAX_PHOTOS = 12;

async function uniqueListingSlug(title: string): Promise<string> {
  const base = slugify(title) || "listing";
  let slug = base;
  let n = 1;
  while (await db.propertyListing.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function parseListing(formData: FormData) {
  return ListingSchema.safeParse({
    kind: formData.get("kind"),
    propertyType: formData.get("propertyType"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    bedrooms: formData.get("bedrooms") ?? undefined,
    bathrooms: formData.get("bathrooms") ?? undefined,
    rooms: formData.get("rooms") ?? undefined,
    areaSqFt: formData.get("areaSqFt") ?? undefined,
    yearBuilt: formData.get("yearBuilt") ?? undefined,
    address: formData.get("address"),
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    state: formData.get("state"),
    contactName: formData.get("contactName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
}

// Multi-value inputs: feature checkboxes and the ordered hidden photo fields.
// Both are validated server-side against what we actually accept.
function parseFeatures(formData: FormData): string[] {
  return formData.getAll("features").map(String).filter(isEstateFeature).slice(0, 40);
}

function parsePhotos(formData: FormData): string[] {
  return formData
    .getAll("photos")
    .map(String)
    .filter((u) => /^https:\/\//.test(u) && u.length < 500)
    .slice(0, MAX_PHOTOS);
}

// Create a listing — Professional tier only (same bracket as businesses/jobs).
export async function createListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!canPostListing(user)) return { message: "Listings require the Professional tier." };

  const parsed = parseListing(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { title, city, email, zip, ...rest } = parsed.data;
  const point = lookupZip(zip);
  const slug = await uniqueListingSlug(title);
  await db.propertyListing.create({
    data: {
      ...rest,
      title,
      slug,
      ownerId: user.id,
      city: city ?? null,
      zip: zip ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      email: email || null,
      features: parseFeatures(formData),
      photos: parsePhotos(formData),
    },
  });

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/realestate`, "page");
  await flagGaEvent("listing_created");
  redirect(`/${locale}/realestate/${slug}`);
}

// Edit a listing — owner or admin only.
export async function updateListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const id = String(formData.get("listingId") ?? "");
  const listing = await db.propertyListing.findUnique({
    where: { id },
    select: { ownerId: true, slug: true, photos: true },
  });
  if (!listing) return { message: "Listing not found." };
  if (listing.ownerId !== user.id && user.role !== "ADMIN") return { message: "Not allowed." };

  const parsed = parseListing(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { title, city, email, zip, bedrooms, bathrooms, rooms, areaSqFt, yearBuilt, description, contactName, phone, ...rest } = parsed.data;
  const point = lookupZip(zip);
  const photos = parsePhotos(formData);
  await db.propertyListing.update({
    where: { id },
    data: {
      ...rest,
      title,
      city: city ?? null,
      zip: zip ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      email: email || null,
      description: description ?? null,
      contactName: contactName ?? null,
      phone: phone ?? null,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      rooms: rooms ?? null,
      areaSqFt: areaSqFt ?? null,
      yearBuilt: yearBuilt ?? null,
      active: formData.get("active") === "on",
      features: parseFeatures(formData),
      photos,
    },
  });
  // Photos the owner removed from the gallery are released from storage.
  await deleteUploadsByUrl(listing.photos.filter((p) => !photos.includes(p)));

  const locale = String(formData.get("locale") ?? "en");
  revalidatePath(`/${locale}/realestate/${listing.slug}`, "page");
  revalidatePath(`/${locale}/realestate`, "page");
  return { ok: true, message: "Saved." };
}

// Delete a listing — owner or admin only.
export async function deleteListing(listingId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const listing = await db.propertyListing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, photos: true },
  });
  if (!listing || (listing.ownerId !== user.id && user.role !== "ADMIN")) return;
  await db.propertyListing.delete({ where: { id: listingId } });
  await deleteUploadsByUrl(listing.photos);
  revalidatePath(`/${locale}/realestate`, "page");
  redirect(`/${locale}/realestate/mine`);
}

// Report a listing to staff (scam, wrong info, discrimination, spam…).
export async function reportPropertyListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const listingId = String(formData.get("listingId") ?? "");
  const reasonKey = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!isEstateReportReason(reasonKey)) return { errors: { reason: ["Pick a reason."] } };

  const listing = await db.propertyListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, title: true, price: true, kind: true, address: true },
  });
  if (!listing) return { message: "Not found." };
  if (listing.ownerId === user.id) return { message: "You can't report your own listing." };

  const dupe = await db.report.findFirst({
    where: { reporterId: user.id, propertyListingId: listingId, status: "OPEN" },
    select: { id: true },
  });
  if (dupe) return { ok: true };

  await db.report.create({
    data: {
      reporterId: user.id,
      reportedUserId: listing.ownerId,
      propertyListingId: listingId,
      reason: details ? `${reasonKey} — ${details}` : reasonKey,
      context: `${listing.title} ($${listing.price}${listing.kind === "RENT" ? "/mo" : ""}) — ${listing.address}`.slice(0, 280),
    },
  });
  return { ok: true };
}
