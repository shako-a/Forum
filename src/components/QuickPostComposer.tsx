"use client";

import { useActionState, useEffect, useRef } from "react";
import { quickPost } from "@/app/actions/posts";
import { track } from "@/lib/track";
import { IdentityPicker, type AliasOption } from "@/components/IdentityPicker";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Inline quick-post on the home feed: type and publish directly. Auto-filed
// under Discussions, supports the anonymous-alias chooser, and shows a notice
// that it may be moved to a fitting community.
export function QuickPostComposer({
  locale,
  dict,
  realName,
  aliases,
}: {
  locale: Locale;
  dict: Dictionary;
  realName: string;
  aliases: AliasOption[];
}) {
  const [state, action, pending] = useActionState(quickPost, undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (inputRef.current) inputRef.current.value = "";
      track("post_created", { method: "quick" });
    }
  }, [state]);

  return (
    <form action={action} className="quick-composer">
      <input type="hidden" name="locale" value={locale} />

      <div className="quick-composer-row">
        <IdentityPicker realName={realName} aliases={aliases} dict={dict} />
        <input
          ref={inputRef}
          name="text"
          className="quick-input"
          placeholder={dict.feed.composerPlaceholder}
          maxLength={300}
          autoComplete="off"
        />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {dict.common.post}
        </button>
      </div>

      {state?.errors?.text && <p className="field-error">{state.errors.text.join(" ")}</p>}
      {state?.message && !state.ok && <p className="field-error">{state.message}</p>}

      <p className="quick-note">⚠ {dict.feed.quickPostNote}</p>
    </form>
  );
}
