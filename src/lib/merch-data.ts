import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { MERCH_LOW_STOCK, MERCH_PAID_STATUSES } from "@/lib/merch";

const PRODUCT_CARD = {
  id: true,
  slug: true,
  name: true,
  category: true,
  priceCents: true,
  photos: true,
  featured: true,
  active: true,
  sortOrder: true,
  variants: {
    where: { active: true },
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, label: true, stock: true, priceDeltaCents: true },
  },
} satisfies Prisma.MerchProductSelect;

export type MerchProductCard = Prisma.MerchProductGetPayload<{ select: typeof PRODUCT_CARD }>;

// Products for the marketplace top strip: featured first, then newest.
export async function getMerchStrip(take = 8) {
  return db.merchProduct.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take,
    select: PRODUCT_CARD,
  });
}

export async function getMerchProducts() {
  return db.merchProduct.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: PRODUCT_CARD,
  });
}

export async function getMerchProduct(slug: string) {
  return db.merchProduct.findUnique({
    where: { slug },
    include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
}

// Total sellable stock across a product's variants (variant-less products
// are treated as always in stock).
export function productInStock(p: { variants: { stock: number }[] }): boolean {
  return p.variants.length === 0 || p.variants.some((v) => v.stock > 0);
}

export async function getMyMerchOrders(buyerId: string) {
  return db.merchOrder.findMany({
    where: { buyerId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

export async function getMerchOrderByNumber(number: number) {
  return db.merchOrder.findUnique({
    where: { number },
    include: { items: true, buyer: { select: { id: true, forumName: true } } },
  });
}

// --- Admin ----------------------------------------------------------------
export async function getMerchAdminProducts() {
  return db.merchProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      _count: { select: { items: true } },
    },
  });
}

export async function getMerchAdminOrders(status?: string) {
  return db.merchOrder.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { items: true, buyer: { select: { id: true, forumName: true } } },
  });
}

export async function getMerchStats() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paid = { status: { in: MERCH_PAID_STATUSES } };

  const [revenueAll, revenueMonth, byStatus, unitsSold, topProducts, lowStock, ordersMonth] = await Promise.all([
    db.merchOrder.aggregate({ where: paid, _sum: { totalCents: true } }),
    db.merchOrder.aggregate({ where: { ...paid, createdAt: { gte: monthStart } }, _sum: { totalCents: true } }),
    db.merchOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    db.merchOrderItem.aggregate({ where: { order: paid }, _sum: { quantity: true } }),
    db.merchOrderItem.groupBy({
      by: ["name"],
      where: { order: paid },
      _sum: { quantity: true, unitCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.merchVariant.findMany({
      where: { active: true, stock: { lte: MERCH_LOW_STOCK }, product: { active: true } },
      include: { product: { select: { name: true, id: true } } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    db.merchOrder.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return {
    revenueAllCents: revenueAll._sum.totalCents ?? 0,
    revenueMonthCents: revenueMonth._sum.totalCents ?? 0,
    ordersMonth,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>,
    unitsSold: unitsSold._sum.quantity ?? 0,
    topProducts: topProducts.map((p) => ({ name: p.name, quantity: p._sum.quantity ?? 0 })),
    lowStock: lowStock.map((v) => ({ productId: v.product.id, product: v.product.name, label: v.label, stock: v.stock })),
  };
}
