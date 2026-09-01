"use client";

import Link from "@/components/Link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutoStatus, deleteAutoListing } from "@/app/actions/auto";
import type { AutoStatus } from "@/lib/auto";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Owner toolbar: mark sold / rented out, pause, relist, edit, delete.
export function AutoOwnerControls({
  locale,
  dict,
  listingId,
  slug,
  kind,
  status,
  compact = false,
}: {
  locale: Locale;
  dict: Dictionary;
  listingId: string;
  slug: string;
  kind: string;
  status: string;
  compact?: boolean;
}) {
  const t = dict.auto;
  const m = dict.market;
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });
  const setStatus = (s: AutoStatus) => run(() => setAutoStatus(listingId, s, locale));

  return (
    <div className={`mk-owner${compact ? " mk-owner-compact" : ""}`}>
      {status === "ACTIVE" ? (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setStatus("SOLD")}>
            ✓ {kind === "RENT" ? t.markRented : t.markSold}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setStatus("PAUSED")}>
            ⏸ {m.pause}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setStatus("ACTIVE")}>
          ↻ {status === "SOLD" ? m.relist : m.resume}
        </button>
      )}
      <Link href={`/${locale}/auto/${slug}/edit`} className="btn btn-ghost btn-sm">✏️ {dict.admin.edit}</Link>
      {!compact && (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm(m.confirmDelete)) run(() => deleteAutoListing(listingId, locale));
          }}
        >
          🗑 {dict.admin.delete}
        </button>
      )}
    </div>
  );
}
