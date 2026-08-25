import { NextResponse } from "next/server";
import { authorize } from "@/lib/dal";
import { getMerchAdminOrders } from "@/lib/merch-data";
import { isMerchOrderStatus } from "@/lib/merch";

// Admin-only CSV export of merch orders (optionally one status).
export async function GET(req: Request) {
  if (!(await authorize("ADMIN"))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const orders = await getMerchAdminOrders(isMerchOrderStatus(status) ? status : undefined);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["number", "created", "status", "buyer", "contact", "email", "phone", "address", "items", "subtotal", "shipping", "total", "paid_at", "shipped_at", "tracking", "buyer_note", "admin_note"];
  const lines = orders.map((o) =>
    [
      o.number,
      o.createdAt.toISOString(),
      o.status,
      o.buyer?.forumName ?? "",
      o.contactName,
      o.email,
      o.phone ?? "",
      o.shippingAddress,
      o.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity} @${(i.unitCents / 100).toFixed(2)}`).join("; "),
      (o.subtotalCents / 100).toFixed(2),
      (o.shippingCents / 100).toFixed(2),
      (o.totalCents / 100).toFixed(2),
      o.paidAt?.toISOString() ?? "",
      o.shippedAt?.toISOString() ?? "",
      o.trackingNumber ?? "",
      o.note ?? "",
      o.adminNote ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="merch-orders${status ? `-${status.toLowerCase()}` : ""}.csv"`,
    },
  });
}
