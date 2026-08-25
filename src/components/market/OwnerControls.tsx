"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMarketStatus, renewMarketListing, deleteMarketListing } from "@/app/actions/market";
import type { MarketStatus } from "@/lib/market";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Seller's toolbar: mark sold / reactivate / pause, renew (bump), edit, delete.
export function OwnerControls({
  locale,
  dict,
  listingId,
  slug,
  status,
  renewable,
  expired,
  compact = false,
}: {
  locale: Locale;
  dict: Dictionary;
  listingId: string;
  slug: string;
  status: string;
  renewable: boolean;
  expired: boolean;
  compact?: boolean;
}) {
  const t = dict.market;
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }
  const setStatus = (s: MarketStatus) => run(() => setMarketStatus(listingId, s, locale));

  return (
    <div className={`mk-owner${compact ? " mk-owner-compact" : ""}`}>
      {status === "ACTIVE" ? (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setStatus("SOLD")}>
            ✓ {t.markSold}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setStatus("PAUSED")}>
            ⏸ {t.pause}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setStatus("ACTIVE")}>
          ↻ {status === "SOLD" ? t.relist : t.resume}
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          type="button"
          className={`btn btn-ghost btn-sm${expired ? " mk-renew-urgent" : ""}`}
          disabled={pending || !renewable}
          title={renewable ? t.renewHint : t.renewCooldown}
          onClick={() => run(() => renewMarketListing(listingId, locale))}
        >
          ⬆ {expired ? t.renewExpired : t.renew}
        </button>
      )}
      <Link href={`/${locale}/market/${slug}/edit`} className="btn btn-ghost btn-sm">
        ✏️ {dict.admin.edit}
      </Link>
      {!compact && (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm(t.confirmDelete)) run(() => deleteMarketListing(listingId, locale));
          }}
        >
          🗑 {dict.admin.delete}
        </button>
      )}
    </div>
  );
}
