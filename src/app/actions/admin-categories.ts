"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { CategorySchema, zodErrors, type FormState } from "@/lib/definitions";
import { slugify } from "@/lib/slug";

// All category management is admin-only. Server Actions are reachable via direct
// POST, so every action re-checks authorization regardless of the admin layout gate.

function parseForm(formData: FormData) {
  return CategorySchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameKa: formData.get("nameKa"),
    slug: (formData.get("slug") as string) || undefined,
    descriptionEn: (formData.get("descriptionEn") as string) || undefined,
    descriptionKa: (formData.get("descriptionKa") as string) || undefined,
    locked: formData.get("locked") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

async function uniqueSlug(desired: string, exceptId?: string): Promise<string | null> {
  const base = (desired && slugify(desired)) || "category";
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await db.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === exceptId) return candidate;
  }
  return null;
}

export async function createCategory(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "Unauthorized." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { nameEn, nameKa, slug, descriptionEn, descriptionKa, locked, sortOrder } = parsed.data;

  const finalSlug = await uniqueSlug(slug || nameEn);
  if (!finalSlug) return { errors: { slug: ["Could not generate a unique slug."] } };

  await db.category.create({
    data: {
      slug: finalSlug,
      nameEn,
      nameKa,
      descriptionEn: descriptionEn || null,
      descriptionKa: descriptionKa || null,
      locked: locked ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });

  revalidatePath("/", "layout"); // categories appear in sidebars/nav across the app
  return { ok: true };
}

export async function updateCategory(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "Unauthorized." };

  const id = String(formData.get("id") ?? "");
  const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { message: "Category not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { nameEn, nameKa, slug, descriptionEn, descriptionKa, locked, sortOrder } = parsed.data;

  const finalSlug = await uniqueSlug(slug || nameEn, id);
  if (!finalSlug) return { errors: { slug: ["Could not generate a unique slug."] } };

  await db.category.update({
    where: { id },
    data: {
      slug: finalSlug,
      nameEn,
      nameKa,
      descriptionEn: descriptionEn || null,
      descriptionKa: descriptionKa || null,
      locked: locked ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Delete a category. Blocked server-side when it still has posts (no cascade). */
export async function deleteCategory(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;

  const category = await db.category.findUnique({
    where: { id },
    select: { _count: { select: { posts: true } } },
  });
  if (!category || category._count.posts > 0) return;

  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}

/** Assign a member as a moderator of a category (and promote USER → MODERATOR). */
export async function assignCategoryModerator(categoryId: string, userId: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return;

  await db.category.update({
    where: { id: categoryId },
    data: { moderators: { connect: { id: userId } } },
  });
  // A plain USER assigned to moderate becomes a MODERATOR; never downgrade admins.
  if (user.role === "USER") {
    await db.user.update({ where: { id: userId }, data: { role: "MODERATOR" } });
  }

  revalidatePath("/[lang]/admin/categories", "page");
}

/** Remove a moderator from a category (demote to USER if they moderate nothing else). */
export async function removeCategoryModerator(categoryId: string, userId: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;

  await db.category.update({
    where: { id: categoryId },
    data: { moderators: { disconnect: { id: userId } } },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, _count: { select: { moderatedCategories: true } } },
  });
  if (user && user.role === "MODERATOR" && user._count.moderatedCategories === 0) {
    await db.user.update({ where: { id: userId }, data: { role: "USER" } });
  }

  revalidatePath("/[lang]/admin/categories", "page");
}
