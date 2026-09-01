import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getMerchOrderByNumber } from "@/lib/merch-data";
import { formatCents, orderStatusLabel, MERCH_ORDER_FLOW } from "@/lib/merch";
import { cancelMyMerchOrder } from "@/app/actions/merch";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ConfirmButton } from "@/components/business/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/[lang]/market/orders/[number]">) {
  const { lang, number } = await params;
  if (!isLocale(lang)) notFound();
  const user = await requireUser(lang);
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();
  const [dict, allCategories, order] = await Promise.all([
    getDictionary(lang),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getMerchOrderByNumber(n),
  ]);
  if (!order || (order.buyerId !== user.id && user.role !== "ADMIN")) notFound();
  const t = dict.market;
  const stepIndex = MERCH_ORDER_FLOW.indexOf(order.status as (typeof MERCH_ORDER_FLOW)[number]);

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell shell-wide">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          <Link href={`/${lang}/market/orders`} className="btn btn-ghost btn-sm biz-back">‹ {t.myOrders}</Link>
          <div className="account-head">
            <h1 className="account-title">{t.orderNumber.replace("{n}", String(order.number))}</h1>
            <p className="account-sub">{new Date(order.createdAt).toLocaleString()} · {orderStatusLabel(order.status, lang)}</p>
          </div>

          {order.status === "NEW" && <div className="mk-status-banner">✅ {t.orderPlacedNote}</div>}
          {order.status === "CANCELLED" && <div className="mk-status-banner mk-status-sold">✖️ {t.orderCancelledNote}</div>}

          {order.status !== "CANCELLED" && (
            <ol className="merch-timeline card card-pad">
              {MERCH_ORDER_FLOW.map((s, i) => (
                <li key={s} className={i <= stepIndex ? "done" : ""}>
                  <span className="merch-timeline-dot" />
                  <span>{orderStatusLabel(s, lang)}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">🛍️ {t.orderItems}</h2>
            <table className="merch-items">
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}{i.variantLabel ? ` · ${i.variantLabel}` : ""}</td>
                    <td className="num">× {i.quantity}</td>
                    <td className="num">{formatCents(i.unitCents * i.quantity)}</td>
                  </tr>
                ))}
                {order.shippingCents > 0 && (
                  <tr><td>{t.shipping}</td><td /><td className="num">{formatCents(order.shippingCents)}</td></tr>
                )}
                <tr className="merch-items-total"><td>{t.total}</td><td /><td className="num">{formatCents(order.totalCents)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">🚚 {t.shippingDetails}</h2>
            <dl className="mk-details">
              <dt>{t.recipient}</dt><dd>{order.contactName}</dd>
              <dt>{dict.business.email}</dt><dd>{order.email}</dd>
              {order.phone && <><dt>{dict.business.phone}</dt><dd>{order.phone}</dd></>}
              <dt>{t.shippingAddress}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{order.shippingAddress}</dd>
              {order.note && <><dt>{t.orderNote}</dt><dd>{order.note}</dd></>}
              {order.trackingNumber && <><dt>{t.tracking}</dt><dd>{order.trackingNumber}</dd></>}
            </dl>
          </div>

          {order.status === "NEW" && order.buyerId === user.id && (
            <div className="card card-pad biz-danger">
              <ConfirmButton
                action={cancelMyMerchOrder.bind(null, order.id, lang)}
                label={`✖️ ${t.cancelOrder}`}
                confirmText={t.cancelOrderConfirm}
                className="btn btn-danger"
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
