"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localeHref } from "@/lib/locale-url";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { slugify } from "@/lib/slug";
import { createNotification } from "@/lib/notify";
import { deleteUploadsByUrl } from "@/lib/media";
import type { FormState } from "@/lib/definitions";
import { isMerchCategory, isMerchOrderStatus, MERCH_ORDER_FLOW, type MerchOrderStatus } from "@/lib/merch";

function revalidateShop() {
  revalidatePath("/[lang]/market", "layout");
  revalidatePath("/[lang]/admin/merch", "layout");
}

async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name) || "product";
  let slug = base;
  let n = 1;
  for (;;) {
    const hit = await db.merchProduct.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${n++}`;
  }
}

// Variant rows arrive as parallel arrays from the editor.
function parseVariants(formData: FormData) {
  const labels = formData.getAll("vLabel").map(String);
  const skus = formData.getAll("vSku").map(String);
  const stocks = formData.getAll("vStock").map((v) => Math.max(0, Math.floor(Number(v) || 0)));
  const deltas = formData.getAll("vDelta").map((v) => Math.round((Number(v) || 0) * 100));
  const ids = formData.getAll("vId").map(String);
  return labels
    .map((label, i) => ({
      id: ids[i] || null,
      label: label.trim().slice(0, 60),
      sku: skus[i]?.trim().slice(0, 60) || null,
      stock: stocks[i] ?? 0,
      priceDeltaCents: deltas[i] ?? 0,
      sortOrder: i,
    }))
    .filter((v) => v.label.length > 0)
    .slice(0, 40);
}

// Create or update a product with its variants and photos.
export async function saveMerchProduct(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "Unauthorized." };

  const id = String(formData.get("productId") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 6000);
  const category = String(formData.get("category") ?? "apparel");
  const price = Number(formData.get("price"));
  const active = formData.get("active") === "on";
  const featured = formData.get("featured") === "on";
  const sortOrder = Math.floor(Number(formData.get("sortOrder")) || 0);
  const photos = formData
    .getAll("photos")
    .map(String)
    .filter((u) => /^https:\/\//.test(u) && u.length < 500)
    .slice(0, 10);

  const errors: Record<string, string[]> = {};
  if (name.length < 2) errors.name = ["Name is required."];
  if (description.length < 5) errors.description = ["Add a description."];
  if (!isMerchCategory(category)) errors.category = ["Pick a category."];
  if (!Number.isFinite(price) || price <= 0) errors.price = ["Enter a price."];
  if (Object.keys(errors).length) return { errors };

  const priceCents = Math.round(price * 100);
  const variants = parseVariants(formData);

  if (!id) {
    const slug = await uniqueSlug(name);
    const created = await db.merchProduct.create({
      data: {
        slug,
        name,
        description,
        category,
        priceCents,
        photos,
        active,
        featured,
        sortOrder,
        variants: { create: variants.map(({ id: _i, ...v }) => v) },
      },
      select: { id: true },
    });
    revalidateShop();
    const locale = String(formData.get("locale") ?? "en");
    redirect(localeHref(`/${locale}/admin/merch/${created.id}`));
  }

  const existing = await db.merchProduct.findUnique({
    where: { id },
    include: { variants: { select: { id: true } } },
  });
  if (!existing) return { message: "Product not found." };

  const keepIds = new Set(variants.map((v) => v.id).filter((x): x is string => !!x));
  await db.$transaction([
    db.merchProduct.update({
      where: { id },
      data: { name, description, category, priceCents, photos, active, featured, sortOrder },
    }),
    // Variants removed in the editor are deactivated, not deleted, so past
    // order items keep their reference.
    db.merchVariant.updateMany({
      where: { productId: id, id: { notIn: [...keepIds] } },
      data: { active: false },
    }),
    ...variants.map((v) =>
      v.id
        ? db.merchVariant.update({
            where: { id: v.id },
            data: { label: v.label, sku: v.sku, stock: v.stock, priceDeltaCents: v.priceDeltaCents, sortOrder: v.sortOrder, active: true },
          })
        : db.merchVariant.create({ data: { productId: id, label: v.label, sku: v.sku, stock: v.stock, priceDeltaCents: v.priceDeltaCents, sortOrder: v.sortOrder } }),
    ),
  ]);
  await deleteUploadsByUrl(existing.photos.filter((p) => !photos.includes(p)));
  revalidateShop();
  return { ok: true, message: "Saved." };
}

export async function setMerchProductFlag(id: string, flag: "active" | "featured", value: boolean): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.merchProduct.update({ where: { id }, data: { [flag]: value } }).catch(() => {});
  revalidateShop();
}

export async function deleteMerchProduct(id: string, locale: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const product = await db.merchProduct.findUnique({ where: { id }, select: { photos: true } });
  if (!product) return;
  await db.merchProduct.delete({ where: { id } });
  await deleteUploadsByUrl(product.photos);
  revalidateShop();
  redirect(localeHref(`/${locale}/admin/merch`));
}

// Move an order along the pipeline (or cancel it). Cancelling returns stock;
// moving to PAID/SHIPPED stamps the timestamps; the buyer is notified.
export async function setMerchOrderStatus(
  orderId: string,
  status: MerchOrderStatus,
  extra?: { trackingNumber?: string; adminNote?: string },
): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor || !isMerchOrderStatus(status)) return;
  const order = await db.merchOrder.findUnique({
    where: { id: orderId },
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!order || order.status === status) return;

  const data: Record<string, unknown> = { status };
  if (status === "PAID" && !order.paidAt) data.paidAt = new Date();
  if (status === "SHIPPED" && !order.shippedAt) data.shippedAt = new Date();
  if (extra?.trackingNumber !== undefined) data.trackingNumber = extra.trackingNumber.trim().slice(0, 100) || null;
  if (extra?.adminNote !== undefined) data.adminNote = extra.adminNote.trim().slice(0, 500) || null;

  const restock = status === "CANCELLED" && order.status !== "CANCELLED";
  const unrestock = order.status === "CANCELLED" && status !== "CANCELLED";
  await db.$transaction([
    db.merchOrder.update({ where: { id: orderId }, data }),
    ...(restock || unrestock
      ? order.items
          .filter((i) => i.variantId)
          .map((i) =>
            db.merchVariant.update({
              where: { id: i.variantId! },
              data: { stock: restock ? { increment: i.quantity } : { decrement: i.quantity } },
            }),
          )
      : []),
  ]);

  if (order.buyerId) {
    await createNotification({
      userId: order.buyerId,
      type: "merch_order",
      actorId: null,
      title: `#${order.number}`,
      body: MERCH_ORDER_FLOW.includes(status as (typeof MERCH_ORDER_FLOW)[number]) || status === "CANCELLED" ? status : null,
      url: `/market/orders/${order.number}`,
    });
  }
  revalidatePath("/[lang]/admin/merch", "layout");
  revalidatePath("/[lang]/market/orders", "layout");
}

export async function setMerchOrderNote(orderId: string, adminNote: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.merchOrder.update({ where: { id: orderId }, data: { adminNote: adminNote.trim().slice(0, 500) || null } }).catch(() => {});
  revalidatePath("/[lang]/admin/merch", "layout");
}
