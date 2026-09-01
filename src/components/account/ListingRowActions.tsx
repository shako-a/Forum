"use client";

import Link from "@/components/Link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMarketStatus, renewMarketListing } from "@/app/actions/market";
import { setAutoStatus } from "@/app/actions/auto";
import { setMyListingActive } from "@/app/actions/estate";
import { setUserJobActive } from "@/app/actions/jobs";
import type { MyListingKind, MyListingStatus } from "@/lib/my-listings";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Row controls for the account listings table. Each area has its own action,
// so this maps the normalized row back to the right one.
export function ListingRowActions({
  locale,
  dict,
  kind,
  id,
  status,
  editHref,
  href,
  canRenew,
  businessManaged,
}: {
  locale: Locale;
  dict: Dictionary;
  kind: MyListingKind;
  id: string;
  status: MyListingStatus;
  editHref: string;
  href: string;
  canRenew: boolean;
  businessManaged: boolean;
}) {
  const t = dict.account;
  const m = dict.market;
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const setLive = (live: boolean) => {
    switch (kind) {
      case "estate":
        return run(() => setMyListingActive(id, live, locale));
      case "auto":
        return run(() => setAutoStatus(id, live ? "ACTIVE" : "PAUSED", locale));
      case "market":
        return run(() => setMarketStatus(id, live ? "ACTIVE" : "PAUSED", locale));
      case "job":
        return run(() => setUserJobActive(id, live, locale));
    }
  };

  // Staff removals are not the owner's to undo; jobs attached to a business
  // are managed on that business's own jobs page.
  const canToggle = status !== "REMOVED" && status !== "CLOSED" && !(kind === "job" && businessManaged);

  return (
    <div className="my-listing-actions">
      {status === "EXPIRED" && canRenew && (
        <button type="button" className="action my-listing-renew" disabled={pending} onClick={() => run(() => renewMarketListing(id, locale))}>
          ⬆ {m.renew}
        </button>
      )}
      {canToggle &&
        (status === "PAUSED" ? (
          <button type="button" className="action" disabled={pending} onClick={() => setLive(true)}>
            ↻ {m.resume}
          </button>
        ) : (
          <button type="button" className="action" disabled={pending} onClick={() => setLive(false)}>
            ⏸ {m.pause}
          </button>
        ))}
      <Link href={editHref} className="action">✏️ {dict.admin.edit}</Link>
      <Link href={href} className="action">↗ {t.viewListing}</Link>
    </div>
  );
}
