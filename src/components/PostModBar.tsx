"use client";

import { useTransition } from "react";
import { setPostHidden, setRepliesLocked } from "@/app/actions/moderation";
import { DeletePostButton } from "@/components/DeletePostButton";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// Moderator/admin control strip shown on a post for those who may moderate its
// category. Actions re-verify authorization server-side; this is just the UI.
export function PostModBar({
  postId,
  locale,
  slug,
  hidden,
  repliesLocked,
  isAdmin,
  dict,
}: {
  postId: string;
  locale: Locale;
  slug: string;
  hidden: boolean;
  repliesLocked: boolean;
  isAdmin: boolean;
  dict: Dictionary;
}) {
  const t = dict.mod;
  const [pending, startTransition] = useTransition();

  function toggleHidden() {
    if (!hidden && !window.confirm(t.confirmHidePost)) return;
    startTransition(() => void setPostHidden(postId, !hidden, locale, slug));
  }

  function toggleLocked() {
    startTransition(() => void setRepliesLocked(postId, !repliesLocked, locale, slug));
  }

  return (
    <div className="mod-bar" role="group" aria-label={t.tools}>
      <span className="mod-bar-label">🛡 {t.tools}</span>
      <button type="button" className="action" onClick={toggleHidden} disabled={pending}>
        {hidden ? t.showPost : t.hidePost}
      </button>
      <button type="button" className="action" onClick={toggleLocked} disabled={pending}>
        {repliesLocked ? t.unlockReplies : t.lockReplies}
      </button>
      {isAdmin && (
        <DeletePostButton
          postId={postId}
          locale={locale}
          label={t.deletePost}
          confirmText={t.confirmDeletePost}
          redirectHome
        />
      )}
    </div>
  );
}
