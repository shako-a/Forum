"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePost } from "@/app/actions/moderation";
import type { Locale } from "@/i18n/config";

// Admin-only hard delete. On the post page pass redirectHome (the post vanishes,
// so we leave it); in feed lists it just revalidates and the row disappears.
export function DeletePostButton({
  postId,
  locale,
  label,
  confirmText,
  redirectHome = false,
  className = "action mod-action",
}: {
  postId: string;
  locale: Locale;
  label: string;
  confirmText: string;
  redirectHome?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      await deletePost(postId, locale);
      if (redirectHome) router.push(`/${locale}`);
    });
  }

  return (
    <button type="button" className={className} disabled={pending} onClick={onClick}>
      🗑 {label}
    </button>
  );
}
