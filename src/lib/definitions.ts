import * as z from "zod";
import { isBusinessCategory } from "@/lib/business-categories";

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
