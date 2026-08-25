"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canPostAuto } from "@/lib/perks";
import { slugify } from "@/lib/slug";
import { defaultLocale, isLocale } from "@/i18n/config";
import { AutoListingSchema, zodErrors, type FormState, type AutoListingInput } from "@/lib/definitions";
import { AUTO_STATUSES, isAutoFeature, isAutoReportReason, autoTitle, type AutoStatus } from "@/lib/auto";
import { lookupZip } from "@/lib/geo";
import { deleteUploadsByUrl } from "@/lib/media";
import { flagGaEvent } from "@/lib/ga-server";

const MAX_PHOTOS = 12;

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}
function safeLocale(locale: string): string {
  return isLocale(locale) ? locale : defaultLocale;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "car";
  let slug = base;
  let n = 1;
  while (await db.autoListing.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function parse(formData: FormData) {
  const str = (k: string) => formData.get(k) ?? undefined;
  const opt = (k: string) => formData.get(k) || undefined;
  return AutoListingSchema.safeParse({
    kind: str("kind"),
    year: str("year"),
    make: str("make"),
    makeOther: opt("makeOther"),
    model: str("model"),
    bodyType: str("bodyType"),
    mileage: str("mileage"),
    transmission: str("transmission"),
    fuel: str("fuel"),
    drivetrain: str("drivetrain"),
    color: opt("color"),
    condition: opt("condition"),
    vin: opt("vin"),
    price: str("price"),
    negotiable: formData.get("negotiable") === "on",
    insured: formData.get("insured") === "on",
    minRentalDays: str("minRentalDays"),
    depositAmount: str("depositAmount"),
    description: opt("description"),
    city: opt("city"),
    zip: opt("zip"),
    state: str("state"),
    contactName: opt("contactName"),
    phone: opt("phone"),
    email: opt("email"),
  });
}

function parseFeatures(formData: FormData): string[] {
  return formData.getAll("features").map(String).filter(isAutoFeature).slice(0, 60);
}
function parsePhotos(formData: FormData): string[] {
  return formData
    .getAll("photos")
    .map(String)
    .filter((u) => /^https:\/\//.test(u) && u.length < 500)
    .slice(0, MAX_PHOTOS);
}

// Turn parsed fields into the row shape (shared by create and update).
function toData(d: AutoListingInput, formData: FormData) {
  const isRent = d.kind === "RENT";
  const point = lookupZip(d.zip);
  return {
    kind: d.kind,
    year: d.year,
    make: d.make,
    makeOther: d.make === "other" ? (d.makeOther ?? null) : null,
    model: d.model,
    title: autoTitle(d.year, d.make, d.makeOther, d.model),
    bodyType: d.bodyType ?? null,
    mileage: d.mileage ?? null,
    transmission: d.transmission ?? null,
    fuel: d.fuel ?? null,
    drivetrain: d.drivetrain ?? null,
    color: d.color ?? null,
    condition: isRent ? "USED" : d.condition,
    vin: d.vin || null,
    price: d.price,
    negotiable: d.negotiable,
    insured: isRent ? d.insured : false,
    minRentalDays: isRent ? (d.minRentalDays ?? null) : null,
    depositAmount: isRent ? (d.depositAmount ?? null) : null,
    description: d.description ?? null,
    features: parseFeatures(formData),
    photos: parsePhotos(formData),
    city: d.city ?? null,
    zip: d.zip ?? null,
    state: d.state,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    contactName: d.contactName ?? null,
    phone: d.phone ?? null,
    email: d.email || null,
  };
}

async function owned(id: string, user: { id: string; role: string }) {
  const l = await db.autoListing.findUnique({
    where: { id },
    select: { id: true, ownerId: true, slug: true, photos: true, status: true },
  });
  if (!l) return null;
  if (l.ownerId !== user.id && user.role !== "ADMIN") return null;
  return l;
}

export async function createAutoListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!canPostAuto(user)) return { message: "Auto-market listings aren't included in your plan." };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const data = toData(parsed.data, formData);
  const slug = await uniqueSlug(data.title);
  await db.autoListing.create({ data: { ...data, slug, ownerId: user.id } });

  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/auto`, "page");
  await flagGaEvent("auto_listing_created");
  redirect(`/${locale}/auto/${slug}`);
}

export async function updateAutoListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const listing = await owned(String(formData.get("listingId") ?? ""), user);
  if (!listing) return { message: "Not allowed." };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const data = toData(parsed.data, formData);
  await db.autoListing.update({ where: { id: listing.id }, data });
  await deleteUploadsByUrl(listing.photos.filter((p) => !data.photos.includes(p)));

  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/auto/${listing.slug}`, "page");
  revalidatePath(`/${locale}/auto`, "page");
  return { ok: true, message: "Saved." };
}

export async function setAutoStatus(id: string, status: AutoStatus, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !AUTO_STATUSES.includes(status)) return;
  const listing = await owned(id, user);
  if (!listing) return;
  if (listing.status === "REMOVED" && user.role !== "ADMIN") return;
  await db.autoListing.update({ where: { id }, data: { status } });
  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/auto/${listing.slug}`, "page");
  revalidatePath(`/${lang}/auto`, "page");
}

export async function deleteAutoListing(id: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const listing = await owned(id, user);
  if (!listing) return;
  await db.autoListing.delete({ where: { id } });
  await deleteUploadsByUrl(listing.photos);
  const lang = safeLocale(locale);
  revalidatePath(`/${lang}/auto`, "page");
  redirect(`/${lang}/auto/mine`);
}

export async function reportAutoListing(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const listingId = String(formData.get("listingId") ?? "");
  const reasonKey = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!isAutoReportReason(reasonKey)) return { errors: { reason: ["Pick a reason."] } };

  const listing = await db.autoListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, title: true, price: true, kind: true, mileage: true },
  });
  if (!listing) return { message: "Not found." };
  if (listing.ownerId === user.id) return { message: "You can't report your own listing." };

  const dupe = await db.report.findFirst({
    where: { reporterId: user.id, autoListingId: listingId, status: "OPEN" },
    select: { id: true },
  });
  if (dupe) return { ok: true };

  await db.report.create({
    data: {
      reporterId: user.id,
      reportedUserId: listing.ownerId,
      autoListingId: listingId,
      reason: details ? `${reasonKey} — ${details}` : reasonKey,
      context: `${listing.title} ($${listing.price}${listing.kind === "RENT" ? "/day" : ""}${listing.mileage != null ? `, ${listing.mileage} mi` : ""})`.slice(0, 280),
    },
  });
  return { ok: true };
}
