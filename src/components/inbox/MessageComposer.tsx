"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage } from "@/app/actions/inbox";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function MessageComposer({
  locale,
  dict,
  conversationId,
}: {
  locale: Locale;
  dict: Dictionary;
  conversationId: string;
}) {
  const t = dict.inbox;
  const [state, action, pending] = useActionState(sendMessage, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={ref} className="dm-composer">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input
        name="body"
        className="input"
        placeholder={t.messagePlaceholder}
        autoComplete="off"
        aria-invalid={state?.errors?.body ? true : undefined}
      />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {t.send}
      </button>
    </form>
  );
}
