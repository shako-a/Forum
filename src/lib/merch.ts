// Forum merch constants: product categories, order pipeline, money helpers.

import type { Locale } from "@/i18n/config";
import type { LabelDef } from "@/lib/market";

export const MERCH_CATEGORIES: LabelDef[] = [
  { key: "apparel", icon: "👕", en: "Apparel", ka: "ტანსაცმელი" },
  { key: "accessories", icon: "🧢", en: "Accessories", ka: "აქსესუარები" },
  { key: "home", icon: "☕", en: "Home & office", ka: "სახლი და ოფისი" },
  { key: "other", icon: "🎁", en: "Other", ka: "სხვა" },
];
export const isMerchCategory = (v: unknown): v is string =>
  typeof v === "string" && MERCH_CATEGORIES.some((c) => c.key === v);

// Pipeline in order; CANCELLED sits outside it.
export const MERCH_ORDER_FLOW = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED"] as const;
export const MERCH_ORDER_STATUSES = [...MERCH_ORDER_FLOW, "CANCELLED"] as const;
export type MerchOrderStatus = (typeof MERCH_ORDER_STATUSES)[number];
export const isMerchOrderStatus = (v: unknown): v is MerchOrderStatus =>
  typeof v === "string" && (MERCH_ORDER_STATUSES as readonly string[]).includes(v);

export const MERCH_STATUS_LABELS: Record<MerchOrderStatus, { icon: string; en: string; ka: string }> = {
  NEW: { icon: "🆕", en: "New", ka: "ახალი" },
  CONFIRMED: { icon: "✅", en: "Confirmed", ka: "დადასტურებული" },
  PAID: { icon: "💵", en: "Paid", ka: "გადახდილი" },
  SHIPPED: { icon: "📦", en: "Shipped", ka: "გაგზავნილი" },
  DELIVERED: { icon: "🏠", en: "Delivered", ka: "მიწოდებული" },
  CANCELLED: { icon: "✖️", en: "Cancelled", ka: "გაუქმებული" },
};
export function orderStatusLabel(status: string, locale: Locale): string {
  const d = MERCH_STATUS_LABELS[status as MerchOrderStatus];
  return d ? `${d.icon} ${locale === "ka" ? d.ka : d.en}` : status;
}

// Orders in these states count as revenue.
export const MERCH_PAID_STATUSES: MerchOrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

// Flat shipping for now; 0 keeps totals simple until real rates exist.
export const MERCH_SHIPPING_CENTS = 0;
export const MERCH_MAX_QTY = 10;
export const MERCH_LOW_STOCK = 3;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
