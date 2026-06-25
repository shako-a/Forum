"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";
import { pmHasContent, textToPmDoc } from "@/lib/prosemirror";
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
  // null = post as real self; 1..3 = one of the author's anonymous aliases.
  const anonRaw = String(formData.get("anonAlias") ?? "");
  const anonAlias = /^[1-3]$/.test(anonRaw) ? Number(anonRaw) : null;

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
      anonAlias,
      lastActivity: new Date(),
    },
  });

  redirect(`/${locale}/p/${slug}`);
}

// Quick-post from the home composer: just typed text → a post auto-filed under
// "Discussions" and flagged as quick (shows a "may be moved" notice). Supports
// the same anonymous-alias choice as the full composer. Stays on the homepage.
export async function quickPost(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);

  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in to post." };

  const text = String(formData.get("text") ?? "").trim();
  const anonRaw = String(formData.get("anonAlias") ?? "");
  const anonAlias = /^[1-3]$/.test(anonRaw) ? Number(anonRaw) : null;

  if (text.length < 3) return { errors: { text: ["Write at least a few words."] } };

  const category = await db.category.findUnique({
    where: { slug: "discussions" },
    select: { id: true },
  });
  if (!category) return { message: "Default category is unavailable." };

  // Long text: keep the full text in the body, use a trimmed title.
  const title = text.length > 120 ? `${text.slice(0, 119)}…` : text;
  const slug = await uniqueSlug(title);
  await db.post.create({
    data: {
      slug,
      title,
      body: textToPmDoc(text) as unknown as Prisma.InputJsonValue,
      categoryId: category.id,
      authorId: user.id,
      anonAlias,
      quickPosted: true,
      lastActivity: new Date(),
    },
  });

  revalidatePath(`/${locale}`, "page");
  return { ok: true };
}
