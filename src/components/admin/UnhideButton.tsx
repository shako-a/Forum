"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPostHidden, setReplyHidden } from "@/app/actions/moderation";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Unhide a post or reply from the admin review page, then refresh so the item
// drops off the "hidden" list immediately.
export function UnhideButton({
  kind,
  id,
  locale,
  slug,
  dict,
}: {
  kind: "post" | "reply";
  id: string;
  locale: Locale;
  slug: string;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="action"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (kind === "post") await setPostHidden(id, false, locale, slug);
          else await setReplyHidden(id, false, locale, slug);
          router.refresh();
        })
      }
    >
      {dict.admin.unhide}
    </button>
  );
}
