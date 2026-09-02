"use server";

import { redirect } from "next/navigation";
import { localeHref } from "@/lib/locale-url";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, canModerateCategory } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";
import { pmHasContent, pmValidate, textToPmDoc, safeImageUrl, appendImage } from "@/lib/prosemirror";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";
import { getActingBusiness } from "@/lib/acting-as";

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
  if (!user) redirect(localeHref(`/${locale}/login?next=/${locale}/create`));

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
  // Size/depth limits run before anything recursive touches the document.
  const bodyCheck = body === null ? { ok: true } : pmValidate(body, bodyRaw.length);
  if (!bodyCheck.ok) body = null;
  const imageUrl = safeImageUrl(formData.get("image"));

  const errors: Record<string, string[]> = {};
  if (!categoryId) errors.categoryId = ["Please choose a category."];
  if (title.length < 3) errors.title = ["Title must be at least 3 characters."];
  // A post needs body text or an attached image.
  if (!bodyCheck.ok) errors.body = ["The post body is too large or too deeply nested."];
  else if (!pmHasContent(body) && !imageUrl) errors.body = ["Please write something or add an image."];
  if (Object.keys(errors).length) return { errors };

  const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { errors: { categoryId: ["Category not found."] } };

  const finalBody = imageUrl ? appendImage(body, imageUrl) : body;
  const slug = await uniqueSlug(title);
  // Acting as a business overrides the anon-alias choice: the post is attributed
  // to the business, with authorId kept as the human for moderation.
  const acting = await getActingBusiness();
  await db.post.create({
    data: {
      slug,
      title,
      body: finalBody as Prisma.InputJsonValue,
      categoryId,
      authorId: user.id,
      anonAlias: acting ? null : anonAlias,
      authorBusinessId: acting?.id ?? null,
      lastActivity: new Date(),
    },
  });

  await flagGaEvent("post_created");
  redirect(localeHref(`/${locale}/p/${slug}`));
}

// Edit a post's title, category and body. Allowed for the author, a category
// moderator, or an admin. The slug is kept stable (links don't break).
export async function editPost(_state: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const postId = String(formData.get("postId") ?? "");
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, authorId: true, categoryId: true },
  });
  if (!post) return { message: "Post not found." };

  const canEdit = post.authorId === user.id || (await canModerateCategory(user, post.categoryId));
  if (!canEdit) return { message: "You can't edit this post." };

  const categoryId = String(formData.get("categoryId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const bodyRaw = String(formData.get("body") ?? "");
  let body: unknown = null;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    body = null;
  }
  // Size/depth limits run before anything recursive touches the document.
  const bodyCheck = body === null ? { ok: true } : pmValidate(body, bodyRaw.length);
  if (!bodyCheck.ok) body = null;
  const imageUrl = safeImageUrl(formData.get("image"));

  const errors: Record<string, string[]> = {};
  if (!categoryId) errors.categoryId = ["Please choose a category."];
  if (title.length < 3) errors.title = ["Title must be at least 3 characters."];
  if (!bodyCheck.ok) errors.body = ["The post body is too large or too deeply nested."];
  else if (!pmHasContent(body) && !imageUrl) errors.body = ["Please write something or add an image."];
  if (Object.keys(errors).length) return { errors };

  const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return { errors: { categoryId: ["Category not found."] } };

  const finalBody = imageUrl ? appendImage(body, imageUrl) : body;
  await db.post.update({
    where: { id: post.id },
    data: { title, body: finalBody as Prisma.InputJsonValue, categoryId },
  });

  revalidatePath(`/${locale}/p/${post.slug}`);
  revalidatePath(`/${locale}`);
  redirect(localeHref(`/${locale}/p/${post.slug}`));
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
  const acting = await getActingBusiness();
  await db.post.create({
    data: {
      slug,
      title,
      body: textToPmDoc(text) as unknown as Prisma.InputJsonValue,
      categoryId: category.id,
      authorId: user.id,
      anonAlias: acting ? null : anonAlias,
      authorBusinessId: acting?.id ?? null,
      quickPosted: true,
      lastActivity: new Date(),
    },
  });

  revalidatePath(`/${locale}`, "page");
  return { ok: true };
}
