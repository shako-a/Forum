"use client";

import Link from "@/components/Link";
import { useActionState, useMemo, useState } from "react";
import { placeMerchOrder } from "@/app/actions/merch";
import { formatCents, MERCH_MAX_QTY } from "@/lib/merch";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Variant = { id: string; label: string; stock: number; priceDeltaCents: number };

// Product order form: option + quantity + shipping details. Totals update
// live; the server re-validates everything and reserves stock atomically.
export function MerchOrderForm({
  locale,
  dict,
  productId,
  priceCents,
  variants,
  loggedIn,
  loginHref,
  prefill,
}: {
  locale: Locale;
  dict: Dictionary;
  productId: string;
  priceCents: number;
  variants: Variant[];
  loggedIn: boolean;
  loginHref: string;
  prefill: { name: string; email: string; phone: string };
}) {
  const t = dict.market;
  const [state, action, pending] = useActionState(placeMerchOrder, undefined);
  const inStock = variants.filter((v) => v.stock > 0);
  const [variantId, setVariantId] = useState(inStock[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId]);
  const unit = priceCents + (variant?.priceDeltaCents ?? 0);
  const maxQty = Math.min(MERCH_MAX_QTY, variant ? variant.stock : MERCH_MAX_QTY);
  const soldOut = variants.length > 0 && inStock.length === 0;
  const err = state?.errors;

  if (soldOut) return <p className="mk-status-banner">😔 {t.merchSoldOut}</p>;
  if (!loggedIn) {
    return (
      <Link href={loginHref} className="btn btn-primary btn-full">
        {t.orderLoginCta}
      </Link>
    );
  }

  return (
    <form action={action} className="merch-order">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={productId} />
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      {variants.length > 0 && (
        <div className="field">
          <label htmlFor="variantId">
            {t.option}
            <span className="req">*</span>
          </label>
          <div className="merch-variants" role="radiogroup">
            {variants.map((v) => (
              <label key={v.id} className={`re-kind-option${v.stock <= 0 ? " is-out" : ""}`}>
                <input
                  type="radio"
                  name="variantId"
                  value={v.id}
                  disabled={v.stock <= 0}
                  checked={variantId === v.id}
                  onChange={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                />
                <span>
                  {v.label}
                  {v.priceDeltaCents !== 0 && <small> {v.priceDeltaCents > 0 ? "+" : "−"}{formatCents(Math.abs(v.priceDeltaCents))}</small>}
                  {v.stock <= 0 && <small> · {t.merchSoldOut}</small>}
                  {v.stock > 0 && v.stock <= 3 && <small> · {t.onlyLeft.replace("{n}", String(v.stock))}</small>}
                </span>
              </label>
            ))}
          </div>
          {err?.variantId && <span className="field-error">{err.variantId.join(" ")}</span>}
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label htmlFor="quantity">{t.quantity}</label>
          <select id="quantity" name="quantity" className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {err?.quantity && <span className="field-error">{err.quantity.join(" ")}</span>}
        </div>
        <div className="field">
          <label>{t.total}</label>
          <div className="merch-total">{formatCents(unit * qty)}</div>
        </div>
      </div>

      <h3 className="merch-form-sub">{t.shippingDetails}</h3>
      <div className="field">
        <label htmlFor="contactName">{t.recipient}<span className="req">*</span></label>
        <input id="contactName" name="contactName" className="input" defaultValue={prefill.name} required maxLength={100} />
        {err?.contactName && <span className="field-error">{err.contactName.join(" ")}</span>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="email">{dict.business.email}<span className="req">*</span></label>
          <input id="email" name="email" type="email" className="input" defaultValue={prefill.email} required />
          {err?.email && <span className="field-error">{err.email.join(" ")}</span>}
        </div>
        <div className="field">
          <label htmlFor="phone">{dict.business.phone}</label>
          <input id="phone" name="phone" type="tel" className="input" defaultValue={prefill.phone} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="shippingAddress">{t.shippingAddress}<span className="req">*</span></label>
        <textarea id="shippingAddress" name="shippingAddress" className="input" rows={3} required placeholder={t.shippingAddressPlaceholder} />
        {err?.shippingAddress && <span className="field-error">{err.shippingAddress.join(" ")}</span>}
      </div>
      <div className="field">
        <label htmlFor="note">{t.orderNote}</label>
        <input id="note" name="note" className="input" maxLength={500} placeholder={t.orderNotePlaceholder} />
      </div>

      <p className="muted-sm merch-payment-note">💵 {t.paymentNote}</p>
      <button type="submit" className="btn btn-primary btn-full" disabled={pending || (variants.length > 0 && !variantId)}>
        {t.placeOrder} · {formatCents(unit * qty)}
      </button>
    </form>
  );
}
