import * as z from "zod";
import { isBusinessCategory } from "@/lib/business-categories";
import { isPropertyType } from "@/lib/estate";

// Sign-up: mirrors the required profile fields from the spec.
// First/last name + forum name + phone + email + state are mandatory; city optional.
export const SignupFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .trim(),
  forumName: z
    .string()
    .min(2, { error: "Name on the forum must be at least 2 characters." })
    .trim(),
  firstName: z.string().min(1, { error: "First name is required." }).trim(),
  lastName: z.string().min(1, { error: "Last name is required." }).trim(),
  phone: z.string().min(3, { error: "Phone number is required." }).trim(),
  state: z.string().min(1, { error: "State is required." }).trim(),
  city: z.string().trim().optional(),
  hideRealName: z.boolean().optional(),
});

// Admin creates an account directly. Only the functional essentials are
// required (email to log in, a unique forum name, a password) — the profile
// fields the public sign-up form mandates (real name, phone, state) are
// deliberately bypassed here and left blank for the user to fill in later.
export const AdminCreateUserSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .trim(),
  forumName: z
    .string()
    .min(2, { error: "Name on the forum must be at least 2 characters." })
    .trim(),
});

// Admin-set password (same strength rule as signup).
export const SetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
});

// Password recovery.
export const RequestResetSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .trim(),
});

// Account settings: the editable profile fields (same mandatory set as sign-up,
// minus the password — changing the password is a separate flow).
export const ProfileFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  forumName: z
    .string()
    .min(2, { error: "Name on the forum must be at least 2 characters." })
    .trim(),
  firstName: z.string().min(1, { error: "First name is required." }).trim(),
  lastName: z.string().min(1, { error: "Last name is required." }).trim(),
  phone: z.string().min(3, { error: "Phone number is required." }).trim(),
  state: z.string().min(1, { error: "State is required." }).trim(),
  city: z.string().trim().optional(),
  hideRealName: z.boolean().optional(),
});

export type FormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      ok?: boolean;
      // Machine-readable outcome so the form can show a localized message
      // (`message` stays as the English fallback). Used by the login lockout.
      code?: "attemptsLeft" | "lockedOut";
      attemptsLeft?: number;
      lockMinutes?: number;
    }
  | undefined;

// Turn a ZodError into { field: messages[] } without depending on a specific
// zod minor-version flatten signature. Shared by all form-handling actions.
export function zodErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// --- Admin: categories ---------------------------------------------------
// `slug` is optional on input — the action derives one from nameEn when blank.
export const CategorySchema = z.object({
  nameEn: z.string().min(1, { error: "English name is required." }).trim(),
  nameKa: z.string().min(1, { error: "Georgian name is required." }).trim(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, { error: "Slug may only contain lowercase letters, numbers, and hyphens." })
    .trim()
    .optional(),
  descriptionEn: z.string().trim().optional(),
  descriptionKa: z.string().trim().optional(),
  locked: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// --- Admin: advertisement cards -----------------------------------------
// Accepts a full URL, a protocol-less host (we prepend https://), or empty.
const optionalUrl = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const s = v.trim();
    if (s === "" || /^(https?:|data:)/i.test(s)) return s;
    return `https://${s}`;
  },
  z.url({ error: "Enter a valid URL." }).or(z.literal("")).optional(),
);

export const AdCardSchema = z.object({
  titleEn: z.string().min(1, { error: "English title is required." }).trim(),
  titleKa: z.string().min(1, { error: "Georgian title is required." }).trim(),
  titleColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Pick a color." })
    .optional(),
  titleSize: z.coerce.number().int().min(10).max(48).optional(),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  linkUrl: optionalUrl,
  placement: z.enum(["TOP_PANEL", "SIDEBAR"]),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// --- Admin: labels (custom user badges) ---------------------------------
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Pick a color." });
export const LabelSchema = z.object({
  nameEn: z.string().min(1, { error: "English name is required." }).trim(),
  nameKa: z.string().min(1, { error: "Georgian name is required." }).trim(),
  color: hexColor.optional(),
  background: hexColor.optional(),
  font: z.enum(["body", "display"]).optional(),
  bold: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// --- Business accounts ---------------------------------------------------
export const BusinessSchema = z.object({
  name: z.string().min(1, { error: "Business name is required." }).trim(),
  category: z.string().refine(isBusinessCategory, { error: "Pick a category." }),
  tagline: z.string().trim().max(140, { error: "Keep the tagline under 140 characters." }).optional(),
  description: z.string().trim().max(4000).optional(),
  state: z.string().min(1, { error: "State / Country is required." }).trim(),
  city: z.string().trim().optional(),
  website: optionalUrl,
  email: z.email({ error: "Enter a valid email." }).or(z.literal("")).optional(),
  phone: z.string().trim().optional(),
  logoUrl: optionalUrl,
});

export const JobSchema = z.object({
  title: z.string().min(1, { error: "Job title is required." }).trim(),
  description: z.string().min(1, { error: "Job description is required." }).trim().max(4000),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
});

export const ReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, { error: "Pick a rating." }).max(5),
  body: z.string().trim().max(2000).optional(),
});

// --- Real estate ----------------------------------------------------------
// Optional numeric facts: number inputs submit "" when left blank.
const optionalCount = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const ListingSchema = z.object({
  kind: z.enum(["SALE", "RENT"], { error: "Choose sale or rent." }),
  propertyType: z.string().refine(isPropertyType, { error: "Pick a property type." }),
  title: z.string().min(1, { error: "Title is required." }).trim().max(140),
  description: z.string().trim().max(8000).optional(),
  price: z.coerce.number({ error: "Price is required." }).int().min(1, { error: "Price is required." }).max(1_000_000_000),
  bedrooms: optionalCount,
  bathrooms: optionalCount,
  rooms: optionalCount,
  areaSqFt: optionalCount,
  yearBuilt: optionalCount,
  address: z.string().min(1, { error: "Address is required." }).trim().max(200),
  city: z.string().trim().optional(),
  state: z.string().min(1, { error: "State / Country is required." }).trim(),
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().optional(),
  email: z.email({ error: "Enter a valid email." }).or(z.literal("")).optional(),
});

// --- Paid packages ("მეტი") ----------------------------------------------
// Prices are entered in whole currency units in the admin form and stored as
// cents, so a price is never subject to float rounding.
const dollarsToCents = z.coerce
  .number()
  .min(0, { error: "Price cannot be negative." })
  .transform((v) => Math.round(v * 100));

// datetime-local inputs submit "" when cleared; treat that as "no date".
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))
  .refine((d) => d === undefined || !Number.isNaN(d.getTime()), { error: "Invalid date." });

export const PackageSchema = z
  .object({
    nameEn: z.string().min(1, { error: "English name is required." }).trim(),
    nameKa: z.string().min(1, { error: "Georgian name is required." }).trim(),
    blurbEn: z.string().min(1, { error: "English short description is required." }).trim(),
    blurbKa: z.string().min(1, { error: "Georgian short description is required." }).trim(),
    pitchEn: z.string().trim().max(2000).default(""),
    pitchKa: z.string().trim().max(2000).default(""),
    icon: z.string().trim().max(8).optional(),
    accent: hexColor.optional(),
    priceCents: dollarsToCents,
    discountType: z.enum(["PERCENT", "FIXED"]).optional(),
    discountPercent: z.coerce
      .number()
      .int()
      .min(1, { error: "Discount must be at least 1%." })
      .max(99, { error: "Use at most 99%." })
      .optional(),
    discountPriceCents: dollarsToCents.optional(),
    discountStartsAt: optionalDate,
    discountEndsAt: optionalDate,
    isActive: z.boolean().optional(),
    featured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  // A discount is only meaningful with its matching value, and an end date
  // before the start date would silently never apply.
  .refine((d) => d.discountType !== "PERCENT" || d.discountPercent != null, {
    error: "Enter a discount percentage.",
    path: ["discountPercent"],
  })
  .refine((d) => d.discountType !== "FIXED" || d.discountPriceCents != null, {
    error: "Enter the discounted price.",
    path: ["discountPriceCents"],
  })
  .refine((d) => d.discountType !== "FIXED" || d.discountPriceCents == null || d.discountPriceCents < d.priceCents, {
    error: "The promo price must be lower than the normal price.",
    path: ["discountPriceCents"],
  })
  .refine(
    (d) => !d.discountStartsAt || !d.discountEndsAt || d.discountStartsAt < d.discountEndsAt,
    { error: "The end date must be after the start date.", path: ["discountEndsAt"] },
  );

export const FeatureSchema = z.object({
  nameEn: z.string().min(1, { error: "English name is required." }).trim(),
  nameKa: z.string().min(1, { error: "Georgian name is required." }).trim(),
  // Optional on create (derived from the name) and ignored on update, since
  // gating references it.
  key: z
    .string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, { error: "Use letters, digits and underscores." })
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// --- Appearance preferences -------------------------------------------------
export const AppearanceSchema = z.object({
  themePalette: z.string().trim().min(1),
  // Only meaningful when the palette is "custom"; validated regardless so a
  // stale value can never reach the stylesheet.
  themeAccent: hexColor.optional(),
  themeDensity: z.enum(["comfortable", "compact"]),
  themeRadius: z.enum(["rounded", "soft", "square"]),
  themeDepth: z.enum(["full", "subtle", "flat"]),
});

// --- AI packages ------------------------------------------------------------
export const AiPackageSchema = z.object({
  nameEn: z.string().min(1, { error: "English name is required." }).trim(),
  nameKa: z.string().min(1, { error: "Georgian name is required." }).trim(),
  // Empty string = granted to nobody (the AI-User placeholder ships this way).
  tier: z.enum(["SUPPORTER", "DONOR", "PRO"]).optional(),
  isActive: z.boolean().optional(),
  // Entered in dollars, stored as micro-USD.
  monthlyBudgetMicroUsd: z.coerce
    .number()
    .min(0, { error: "Cannot be negative." })
    .transform((v) => Math.round(v * 1_000_000)),
  rolloverPercent: z.coerce
    .number()
    .int()
    .min(0, { error: "Cannot be negative." })
    .max(100, { error: "Roll over at most 100% of the unused amount." }),
});
