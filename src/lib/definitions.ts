import * as z from "zod";

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
  state: z.string().min(1, { error: "State / region is required." }).trim(),
  city: z.string().trim().optional(),
  hideRealName: z.boolean().optional(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
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
const optionalUrl = z
  .url({ error: "Enter a valid URL (including https://)." })
  .or(z.literal(""))
  .optional();

export const AdCardSchema = z.object({
  titleEn: z.string().min(1, { error: "English title is required." }).trim(),
  titleKa: z.string().min(1, { error: "Georgian title is required." }).trim(),
  imageUrl: optionalUrl,
  linkUrl: optionalUrl,
  placement: z.enum(["TOP_PANEL", "SIDEBAR"]),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
