"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { replyToReview } from "@/app/actions/business";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// The business's reply control under a review — shown only to managers. Toggles
// a small textarea; submitting saves (or, when emptied, clears) the reply.
export function ReviewReply({
  locale,
  reviewId,
  existing,
  dict,
}: {
  locale: Locale;
  reviewId: string;
  existing: string | null;
  dict: Dictionary;
}) {
  const t = dict.business;
  const [state, action, pending] = useActionState(replyToReview, undefined);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button type="button" className="action biz-review-replybtn" onClick={() => setOpen(true)}>
        💬 {existing ? t.editReply : t.replyToReview}
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="biz-review-replyform">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="locale" value={locale} />
      <textarea
        name="text"
        rows={2}
        className="reply-textarea"
        defaultValue={existing ?? ""}
        placeholder={t.replyPlaceholder}
      />
      <div className="biz-review-replyactions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {dict.admin.save}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
          {dict.common.cancel}
        </button>
      </div>
    </form>
  );
}
