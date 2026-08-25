import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { getMerchAdminOrders } from "@/lib/merch-data";
import { formatCents, isMerchOrderStatus } from "@/lib/merch";
import { MerchOrdersAdmin, type AdminMerchOrder } from "@/components/admin/MerchOrdersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminMerchOrdersPage({ params, searchParams }: PageProps<"/[lang]/admin/merch/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const status = isMerchOrderStatus(sp.status) ? sp.status : "";

  const [rows, byStatus] = await Promise.all([
    getMerchAdminOrders(status || undefined),
    db.merchOrder.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;

  const orders: AdminMerchOrder[] = rows.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    buyerId: o.buyer?.id ?? null,
    buyerName: o.buyer?.forumName ?? null,
    contactName: o.contactName,
    email: o.email,
    phone: o.phone,
    shippingAddress: o.shippingAddress,
    note: o.note,
    adminNote: o.adminNote,
    trackingNumber: o.trackingNumber,
    items: o.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.quantity}`).join(", "),
    totalLabel: formatCents(o.totalCents),
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    shippedAt: o.shippedAt?.toISOString() ?? null,
  }));

  return <MerchOrdersAdmin dict={dict} locale={lang} orders={orders} status={status} counts={counts} />;
}
