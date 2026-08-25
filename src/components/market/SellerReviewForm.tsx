"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rateSeller, deleteSellerReview } from "@/app/actions/market";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Star picker + optional comment. Pre-filled when the viewer already rated
// this seller (ratings are editable, one per seller).
export function SellerReviewForm({
  locale,
  dict,
  sellerId,
  listingId,
  existing,
}: {
  locale: Locale;
  dict: Dictionary;
  sellerId: string;
  listingId?: string;
  existing: { id: string; rating: number; body: string | null } | null;
}) {
  const t = dict.market;
  const router = useRouter();
  const [state, action, pending] = useActionState(rateSeller, undefined);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [deleting, startDelete] = useTransition();

  // Pull the refreshed rating/review list in once the save lands.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="mk-review-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sellerId" value={sellerId} />
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      <input type="hidden" name="rating" value={rating || ""} />

      <div className="mk-rating-input" role="radiogroup" aria-label={t.yourRating}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`mk-star${(hover || rating) >= n ? " on" : ""}`}
            aria-label={`${n}/5`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
        <span className="muted-sm">{rating ? `${rating}/5` : t.yourRating}</span>
      </div>
      {state?.errors?.rating && <span className="field-error">{state.errors.rating.join(" ")}</span>}
      <textarea
        name="body"
        className="input"
        rows={3}
        defaultValue={existing?.body ?? ""}
        placeholder={t.reviewPlaceholder}
        maxLength={1000}
      />
      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
      <div className="mk-report-actions">
        {existing && (
          <button
            type="button"
            className="action mod-action"
            disabled={deleting}
            onClick={() =>
              startDelete(async () => {
                await deleteSellerReview(existing.id, locale);
                router.refresh();
              })
            }
          >
            {t.reviewDelete}
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || rating === 0}>
          {existing ? t.reviewUpdate : t.reviewSubmit}
        </button>
      </div>
    </form>
  );
}
