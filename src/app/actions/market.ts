"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { getActingBusiness } from "@/lib/acting-as";
import { canPostIn } from "@/lib/posting-access";
import { slugify } from "@/lib/slug";
import { defaultLocale, isLocale } from "@/i18n/config";
import { MarketListingSchema, zodErrors, type FormState } from "@/lib/definitions";
import { canRenew, MARKET_STATUSES, isMarketReportReason, type MarketStatus } from "@/lib/market";
import { hasConversationBetween } from "@/lib/market-data";
import { deleteUploadsByUrl } from "@/lib/media";
import { lookupZip } from "@/lib/geo";
import { flagGaEvent } from "@/lib/ga-server";

const MAX_PHOTOS = 10;

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}
function safeLocale(locale: string): string {
  return isLocale(locale) ? locale : defaultLocale;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "item";
  let slug = base;
  let n = 1;
  while (await db.marketListing.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function parseListing(formData: FormData) {
  return MarketListingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    priceType: formData.get("priceType"),
    price: formData.get("price") ?? undefined,
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    state: formData.get("state"),
    localPickup: formData.get("localPickup") === "on",
    localDelivery: formData.get("localDelivery") === "on",
    canShip: formData.get("canShip") === "on",
    phone: formData.get("phone") || undefined,
  });
}

function parsePhotos(formData: FormData): string[] {
  return formData
    .getAll("photos")
    .map(String)
    .filter((u) => /^https:\/\//.test(u) && u.length < 500)
    .slice(0, MAX_PHOTOS);
}

// Owner (or admin) check shared by the mutations below.
async function ownedListing(id: string, user: { id: string; role: string }) {
  const listing = await db.marketListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, slug: true, photos: true, bumpedAt: true, status: true },
  });
  if (!listing) return null;
  if (listing.sellerId !== user.id && user.role !== "ADMIN") return null;
  return listing;
}

export async function createMarketListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!(await canPostIn("market", user))) return { message: "Selling on the marketplace isn't included in your plan." };

  const parsed = parseListing(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { title, city, phone, priceType, price, zip, ...rest } = parsed.data;
  const point = lookupZip(zip);
  const slug = await uniqueSlug(title);
  // Listing while acting as a business attributes the item to the business.
  const acting = await getActingBusiness();
  await db.marketListing.create({
    data: {
      ...rest,
      title,
      slug,
      priceType,
      price: priceType === "FREE" ? 0 : price,
      city: city ?? null,
      zip: zip ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      phone: phone ?? null,
      photos: parsePhotos(formData),
      sellerId: user.id,
      sellerBusinessId: acting?.id ?? null,
    },
  });

  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/market`, "page");
  await flagGaEvent("market_listing_created");
  redirect(`/${locale}/market/${slug}`);
}

export async function updateMarketListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const listing = await ownedListing(String(formData.get("listingId") ?? ""), user);
  if (!listing) return { message: "Not allowed." };

  const parsed = parseListing(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const { title, city, phone, priceType, price, zip, ...rest } = parsed.data;
  const point = lookupZip(zip);
  const photos = parsePhotos(formData);
  await db.marketListing.update({
    where: { id: listing.id },
    data: {
      ...rest,
      title,
      priceType,
      price: priceType === "FREE" ? 0 : price,
      city: city ?? null,
      zip: zip ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      phone: phone ?? null,
      photos,
    },
  });
  await deleteUploadsByUrl(listing.photos.filter((p) => !photos.includes(p)));

  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/market/${listing.slug}`, "page");
  revalidatePath(`/${locale}/market`, "page");
  return { ok: true, message: "Saved." };
}

// ACTIVE / SOLD / PAUSED. Reactivating also renews so the item resurfaces.
export async function setMarketStatus(id: string, status: MarketStatus, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !MARKET_STATUSES.includes(status)) return;
  const listing = await ownedListing(id, user);
  if (!listing) return;
  // Staff-removed listings stay removed until staff restores them.
  if (listing.status === "REMOVED" && user.role !== "ADMIN") return;
  await db.marketListing.update({
    where: { id },
    data: { status, ...(status === "ACTIVE" ? { bumpedAt: new Date() } : {}) },
  });
  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/market/${listing.slug}`, "page");
  revalidatePath(`/${lang}/market`, "page");
}

// Bump to the top of the directory (rate-limited to once per cooldown).
export async function renewMarketListing(id: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const listing = await ownedListing(id, user);
  if (!listing || !canRenew(listing.bumpedAt) || listing.status === "REMOVED") return;
  await db.marketListing.update({ where: { id }, data: { bumpedAt: new Date(), status: "ACTIVE" } });
  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/market/${listing.slug}`, "page");
  revalidatePath(`/${lang}/market`, "page");
}

export async function deleteMarketListing(id: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const listing = await ownedListing(id, user);
  if (!listing) return;
  await db.marketListing.delete({ where: { id } });
  await deleteUploadsByUrl(listing.photos);
  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/market`, "page");
  redirect(`/${lang}/market/mine`);
}

// Heart toggle. Returns the new saved state.
export async function toggleMarketFavorite(listingId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const key = { userId_listingId: { userId: user.id, listingId } };
  const existing = await db.marketFavorite.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await db.marketFavorite.delete({ where: key });
    return false;
  }
  const listing = await db.marketListing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) return false;
  await db.marketFavorite.create({ data: { userId: user.id, listingId } });
  return true;
}

// --- Reports -------------------------------------------------------------
// Report a listing to staff. Stores the reason key (plus optional details)
// and a snapshot of the listing so the report still reads after edits.
export async function reportMarketListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const listingId = String(formData.get("listingId") ?? "");
  const reasonKey = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!isMarketReportReason(reasonKey)) return { errors: { reason: ["Pick a reason."] } };

  const listing = await db.marketListing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, title: true, price: true, priceType: true, description: true },
  });
  if (!listing) return { message: "Not found." };
  if (listing.sellerId === user.id) return { message: "You can't report your own listing." };

  const dupe = await db.report.findFirst({
    where: { reporterId: user.id, marketListingId: listingId, status: "OPEN" },
    select: { id: true },
  });
  if (dupe) return { ok: true };

  const priceLabel = listing.priceType === "FREE" ? "free" : `$${listing.price}`;
  await db.report.create({
    data: {
      reporterId: user.id,
      reportedUserId: listing.sellerId,
      marketListingId: listingId,
      reason: details ? `${reasonKey} — ${details}` : reasonKey,
      context: `${listing.title} (${priceLabel}) — ${listing.description}`.slice(0, 280),
    },
  });
  return { ok: true };
}

// --- Seller ratings -------------------------------------------------------
// One rating per reviewer per seller (upsert). Only members who have a DM
// thread with the seller can rate — proof of at least some contact.
export async function rateSeller(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const sellerId = String(formData.get("sellerId") ?? "");
  const listingId = String(formData.get("listingId") ?? "") || null;
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000) || null;
  if (!sellerId || sellerId === user.id) return { message: "Invalid review." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { errors: { rating: ["Pick a rating."] } };

  const seller = await db.user.findUnique({ where: { id: sellerId }, select: { id: true } });
  if (!seller) return { message: "Seller not found." };
  if (!(await hasConversationBetween(user.id, sellerId))) {
    return { message: "Message the seller first — reviews are for people who've been in touch." };
  }
  if (listingId) {
    const owns = await db.marketListing.findFirst({ where: { id: listingId, sellerId }, select: { id: true } });
    if (!owns) return { message: "Invalid review." };
  }

  await db.marketSellerReview.upsert({
    where: { sellerId_reviewerId: { sellerId, reviewerId: user.id } },
    create: { sellerId, reviewerId: user.id, listingId, rating, body },
    update: { rating, body, ...(listingId ? { listingId } : {}) },
  });
  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/market`, "layout");
  return { ok: true };
}

export async function deleteSellerReview(reviewId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const review = await db.marketSellerReview.findUnique({ where: { id: reviewId }, select: { reviewerId: true } });
  if (!review || (review.reviewerId !== user.id && user.role !== "ADMIN")) return;
  await db.marketSellerReview.delete({ where: { id: reviewId } });
  revalidatePath(`/${safeLocale(locale)}/market`, "layout");
}
