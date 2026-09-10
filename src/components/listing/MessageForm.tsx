"use client";

import { useActionState } from "react";
import Link from "@/components/Link";
import { sendListingMessage } from "@/app/actions/listing-contact";
import { track } from "@/lib/track";
import type { ContactTarget } from "@/lib/modules";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// "Message the business" — the rail form. Goes through the forum inbox, so a
// signed-out visitor is asked to log in rather than handed an email field.
export function MessageForm({
  target,
  locale,
  dict,
  loggedIn,
  isOwner,
  canMessage,
  loginHref,
}: {
  target: ContactTarget;
  locale: Locale;
  dict: Dictionary;
  loggedIn: boolean;
  isOwner: boolean;
  canMessage: boolean; // false when the listing has no member behind it
  loginHref: string;
}) {
  const t = dict.listing;
  const [state, action, pending] = useActionState(sendListingMessage, undefined);

  if (isOwner) return <p className="muted-sm">{t.messageOwn}</p>;
  if (!canMessage) return <p className="muted-sm">{t.messageUnavailable}</p>;
  if (!loggedIn) {
    return (
      <Link href={loginHref} className="btn btn-primary msg-login">
        {t.messageLogin}
      </Link>
    );
  }
  if (state?.ok) {
    return (
      <div className="msg-sent" role="status">
        <p>✓ {t.messageSent}</p>
        <Link href={`/${locale}/inbox/${state.conversationId ?? ""}`} className="btn btn-ghost btn-sm">
          {t.openInbox} →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="msg-form" onSubmit={() => track("listing_message", { module: target.module })}>
      <input type="hidden" name="module" value={target.module} />
      <input type="hidden" name="listingId" value={target.listingId} />
      <input type="hidden" name="locale" value={locale} />
      <textarea
        name="body"
        className="input"
        rows={5}
        placeholder={t.messagePlaceholder}
        maxLength={4000}
        required
        aria-invalid={state?.errors?.body ? true : undefined}
      />
      {state?.errors?.body && <span className="field-error">{state.errors.body.join(" ")}</span>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "…" : t.send}
      </button>
      <p className="muted-sm msg-hint">{t.messageHint}</p>
    </form>
  );
}
