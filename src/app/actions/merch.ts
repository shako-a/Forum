"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { defaultLocale, isLocale } from "@/i18n/config";
import type { FormState } from "@/lib/definitions";
import { MERCH_MAX_QTY, MERCH_SHIPPING_CENTS } from "@/lib/merch";
import { flagGaEvent } from "@/lib/ga-server";

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// Place an order for one product (+ variant). Stock is reserved atomically:
// the decrement only succeeds if enough is left, so two buyers can't both
// take the last item.
export async function placeMerchOrder(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };

  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const quantity = Math.floor(Number(formData.get("quantity")));
  const contactName = String(formData.get("contactName") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const shippingAddress = String(formData.get("shippingAddress") ?? "").trim().slice(0, 500);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const errors: Record<string, string[]> = {};
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MERCH_MAX_QTY) errors.quantity = [`Quantity must be 1–${MERCH_MAX_QTY}.`];
  if (contactName.length < 2) errors.contactName = ["Enter the recipient's name."];
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = ["Enter a valid email."];
  if (shippingAddress.length < 8) errors.shippingAddress = ["Enter the full shipping address."];
  if (Object.keys(errors).length) return { errors };

  const product = await db.merchProduct.findUnique({
    where: { id: productId },
    include: { variants: { where: { active: true } } },
  });
  if (!product || !product.active) return { message: "This product isn't available." };

  let variant = null as (typeof product.variants)[number] | null;
  if (product.variants.length > 0) {
    variant = product.variants.find((v) => v.id === variantId) ?? null;
    if (!variant) return { errors: { variantId: ["Pick an option."] } };
  }
  const unitCents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  const subtotalCents = unitCents * quantity;
  const totalCents = subtotalCents + MERCH_SHIPPING_CENTS;

  let number: number;
  try {
    number = await db.$transaction(async (tx) => {
      if (variant) {
        const res = await tx.merchVariant.updateMany({
          where: { id: variant.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (res.count === 0) throw new Error("OUT_OF_STOCK");
      }
      const order = await tx.merchOrder.create({
        data: {
          buyerId: user.id,
          contactName,
          email,
          phone,
          shippingAddress,
          note,
          subtotalCents,
          shippingCents: MERCH_SHIPPING_CENTS,
          totalCents,
          paymentMethod: "offline",
          items: {
            create: [
              {
                productId: product.id,
                variantId: variant?.id ?? null,
                name: product.name,
                variantLabel: variant?.label ?? null,
                unitCents,
                quantity,
              },
            ],
          },
        },
        select: { number: true },
      });
      return order.number;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "OUT_OF_STOCK") {
      return { errors: { variantId: ["Not enough stock left for that option."] } };
    }
    throw err;
  }

  const locale = localeFrom(formData);
  revalidatePath(`/${locale}/market/merch`, "layout");
  await flagGaEvent("merch_order_placed");
  redirect(`/${locale}/market/orders/${number}`);
}

// Buyers can cancel while the order is still NEW; stock goes back.
export async function cancelMyMerchOrder(orderId: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const order = await db.merchOrder.findUnique({
    where: { id: orderId },
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!order || order.buyerId !== user.id || order.status !== "NEW") return;
  await db.$transaction([
    db.merchOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
    ...order.items
      .filter((i) => i.variantId)
      .map((i) => db.merchVariant.update({ where: { id: i.variantId! }, data: { stock: { increment: i.quantity } } })),
  ]);
  const lang = isLocale(locale) ? locale : defaultLocale;
  revalidatePath(`/${lang}/market/orders`, "layout");
}
