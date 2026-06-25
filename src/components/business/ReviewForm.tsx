"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/business";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ReviewForm({
  locale,
  dict,
  businessId,
  initialRating = 0,
  initialBody = "",
}: {
  locale: Locale;
  dict: Dictionary;
  businessId: string;
  initialRating?: number;
  initialBody?: string;
}) {
  const t = dict.business;
  const [state, action, pending] = useActionState(submitReview, undefined);
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  return (
    <form action={action} className="review-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="review-stars-pick" role="radiogroup" aria-label={t.yourRating}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={(hover || rating) >= n ? "star-pick on" : "star-pick"}
            aria-label={`${n}`}
            aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
      </div>
      {state?.errors?.rating && <span className="field-error">{state.errors.rating.join(" ")}</span>}

      <textarea
        name="body"
        className="input"
        rows={3}
        placeholder={t.reviewPlaceholder}
        defaultValue={initialBody}
      />
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}
      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}

      <button type="submit" disabled={pending || rating === 0} className="btn btn-primary">
        {initialRating ? t.updateReview : t.submitReview}
      </button>
    </form>
  );
}
