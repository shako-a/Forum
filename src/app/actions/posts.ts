"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";
import { pmHasContent } from "@/lib/prosemirror";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/definitions";

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "post";
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const exists = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createPost(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);

  // Only registered, logged-in users can create a post.
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/create`);

  const categoryId = String(formData.get("categoryId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const bodyRaw = String(formData.get("body") ?? "");

  let body: unknown = null;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    body = null;
  }

  const errors: Record<string, string[]> = {};
  if (!categoryId) errors.categoryId = ["Please choose a category."];
  if (title.length < 3) errors.title = ["Title must be at least 3 characters."];
  if (!pmHasContent(body)) errors.body = ["Please write something in the body."];
  if (Object.keys(errors).length) return { errors };

  const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { errors: { categoryId: ["Category not found."] } };

  const slug = await uniqueSlug(title);
  await db.post.create({
    data: {
      slug,
      title,
      body: body as Prisma.InputJsonValue,
      categoryId,
      authorId: user.id,
      lastActivity: new Date(),
    },
  });

  redirect(`/${locale}/p/${slug}`);
}
