"use client";

import { useState, useTransition } from "react";
import { Vote } from "@/components/Vote";
import { ReplyComposer } from "@/components/ReplyComposer";
import { ReplyEditForm } from "@/components/ReplyEditForm";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteReply } from "@/app/actions/replies";
import { setReplyHidden } from "@/app/actions/moderation";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ReplyActions({
  replyId,
  locale,
  slug,
  postId,
  score,
  myVote,
  canVote,
  canReply,
  canEdit,
  canModerate,
  hidden,
  editText,
  editImage,
  loginHref,
  shareTitle,
  dict,
}: {
  replyId: string;
  locale: Locale;
  slug: string;
  postId: string;
  score: number;
  myVote: number;
  canVote: boolean;
  canReply: boolean;
  canEdit: boolean;
  canModerate: boolean;
  hidden: boolean;
  editText: string;
  editImage: string | null;
  loginHref: string;
  shareTitle: string;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(dict.post.confirmDelete)) return;
    startTransition(() => {
      void deleteReply(replyId, locale, slug);
    });
  }

  function onToggleHidden() {
    startTransition(() => {
      void setReplyHidden(replyId, !hidden, locale, slug);
    });
  }

  return (
    <>
      <div className="reply-actions">
        <Vote
          id={replyId}
          kind="reply"
          initialScore={score}
          initialVote={myVote}
          canVote={canVote}
          loginHref={loginHref}
          orientation="horizontal"
        />
        <button
          type="button"
          className="action"
          onClick={() => (canReply ? setOpen((o) => !o) : (window.location.href = loginHref))}
        >
          {dict.post.reply}
        </button>
        <ShareMenu anchor={`r-${replyId}`} title={shareTitle} dict={dict} />
        {canEdit && (
          <>
            <button type="button" className="action" onClick={() => setEditing((e) => !e)}>
              {dict.post.edit}
            </button>
            <button type="button" className="action" onClick={onDelete}>
              {dict.post.delete}
            </button>
          </>
        )}
        {canModerate && (
          <button type="button" className="action mod-action" onClick={onToggleHidden} disabled={pending}>
            🛡 {hidden ? dict.mod.show : dict.mod.hide}
          </button>
        )}
      </div>

      {editing && (
        <ReplyEditForm
          locale={locale}
          slug={slug}
          replyId={replyId}
          initialText={editText}
          initialImage={editImage}
          dict={dict}
          onDone={() => setEditing(false)}
        />
      )}

      {open && (
        <ReplyComposer
          locale={locale}
          slug={slug}
          postId={postId}
          parentId={replyId}
          dict={dict}
          autoFocus
          onDone={() => setOpen(false)}
        />
      )}
    </>
  );
}
