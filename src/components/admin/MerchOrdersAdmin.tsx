"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setMerchOrderStatus, setMerchOrderNote } from "@/app/actions/admin-merch";
import { MERCH_ORDER_FLOW, MERCH_ORDER_STATUSES, orderStatusLabel, type MerchOrderStatus } from "@/lib/merch";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminMerchOrder = {
  id: string;
  number: number;
  status: string;
  buyerId: string | null;
  buyerName: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  shippingAddress: string;
  note: string | null;
  adminNote: string | null;
  trackingNumber: string | null;
  items: string; // "Tee (M) × 2, Cap × 1"
  totalLabel: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
};

function Row({ o, dict, locale }: { o: AdminMerchOrder; dict: Dictionary; locale: Locale }) {
  const t = dict.admin;
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const idx = MERCH_ORDER_FLOW.indexOf(o.status as (typeof MERCH_ORDER_FLOW)[number]);
  const next = idx >= 0 && idx < MERCH_ORDER_FLOW.length - 1 ? MERCH_ORDER_FLOW[idx + 1] : null;

  const move = (status: MerchOrderStatus) => {
    let trackingNumber: string | undefined;
    if (status === "SHIPPED") {
      const v = window.prompt(t.merchTrackingPrompt, o.trackingNumber ?? "");
      if (v === null) return;
      trackingNumber = v;
    }
    if (status === "CANCELLED" && !window.confirm(t.merchCancelConfirm)) return;
    start(() => void setMerchOrderStatus(o.id, status, { trackingNumber }));
  };

  return (
    <>
      <tr className={o.status === "CANCELLED" ? "opacity-50" : ""}>
        <td>
          <button type="button" className="admin-link merch-order-toggle" onClick={() => setOpen((v) => !v)}>
            #{o.number} {open ? "▾" : "▸"}
          </button>
          <div className="muted-sm">{new Date(o.createdAt).toLocaleDateString()}</div>
        </td>
        <td>
          {o.buyerId ? <Link href={`/${locale}/admin/users/${o.buyerId}`} className="admin-link">{o.buyerName}</Link> : o.contactName}
          <div className="muted-sm">{o.email}</div>
        </td>
        <td>{o.items}</td>
        <td className="num"><strong>{o.totalLabel}</strong></td>
        <td>
          <span className={`merch-status merch-status-${o.status.toLowerCase()}`}>{orderStatusLabel(o.status, locale)}</span>
          {o.trackingNumber && <div className="muted-sm">📮 {o.trackingNumber}</div>}
        </td>
        <td style={{ textAlign: "right" }}>
          <div className="report-actions">
            {next && (
              <button type="button" className="action" disabled={pending} onClick={() => move(next)}>
                → {orderStatusLabel(next, locale)}
              </button>
            )}
            {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
              <button type="button" className="action mod-action" disabled={pending} onClick={() => move("CANCELLED")}>
                ✖ {t.merchCancel}
              </button>
            )}
            {o.status === "CANCELLED" && (
              <button type="button" className="action" disabled={pending} onClick={() => move("NEW")}>
                ↻ {t.merchReopen}
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="merch-order-detail">
          <td colSpan={6}>
            <div className="merch-order-detail-grid">
              <div>
                <strong>{dict.market.shippingDetails}</strong>
                <div>{o.contactName}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{o.shippingAddress}</div>
                {o.phone && <div>📞 {o.phone}</div>}
                {o.note && <div className="muted-sm">💬 {o.note}</div>}
              </div>
              <div>
                <strong>{t.merchTimeline}</strong>
                <div className="muted-sm">{t.created}: {new Date(o.createdAt).toLocaleString()}</div>
                {o.paidAt && <div className="muted-sm">{orderStatusLabel("PAID", locale)}: {new Date(o.paidAt).toLocaleString()}</div>}
                {o.shippedAt && <div className="muted-sm">{orderStatusLabel("SHIPPED", locale)}: {new Date(o.shippedAt).toLocaleString()}</div>}
                <div style={{ marginTop: 6 }}>
                  <strong>{t.note}:</strong> {o.adminNote ?? "—"}{" "}
                  <button
                    type="button"
                    className="action"
                    disabled={pending}
                    onClick={() => {
                      const v = window.prompt(t.resolveNotePrompt, o.adminNote ?? "");
                      if (v === null) return;
                      start(() => void setMerchOrderNote(o.id, v));
                    }}
                  >
                    ✏️
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function MerchOrdersAdmin({
  dict,
  locale,
  orders,
  status,
  counts,
}: {
  dict: Dictionary;
  locale: Locale;
  orders: AdminMerchOrder[];
  status: string;
  counts: Record<string, number>;
}) {
  const t = dict.admin;
  const base = `/${locale}/admin/merch/orders`;
  return (
    <div>
      <div className="admin-list-head">
        <h1 className="admin-h1">📦 {t.merchOrders}</h1>
        <a href={`/api/admin/merch-orders${status ? `?status=${status}` : ""}`} className="btn btn-ghost btn-sm">⬇ {t.exportCsv}</a>
      </div>
      <div className="admin-tabs">
        <Link href={base} className={`admin-tab${!status ? " on" : ""}`}>{t.filterAll}</Link>
        {MERCH_ORDER_STATUSES.map((s) => (
          <Link key={s} href={`${base}?status=${s}`} className={`admin-tab${status === s ? " on" : ""}`}>
            {orderStatusLabel(s, locale)} ({counts[s] ?? 0})
          </Link>
        ))}
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t.merchBuyer}</th>
            <th>{dict.market.orderItems}</th>
            <th>{dict.market.total}</th>
            <th>{t.status}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => <Row key={o.id} o={o} dict={dict} locale={locale} />)}
          {orders.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t.merchNoOrders}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
