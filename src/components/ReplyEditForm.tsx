"use client";

import { useActionState, useEffect, useState } from "react";
import { editReply } from "@/app/actions/replies";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ReplyEditForm({
  locale,
  slug,
  replyId,
  initialText,
  initialImage,
  dict,
  onDone,
}: {
  locale: Locale;
  slug: string;
  replyId: string;
  initialText: string;
  initialImage: string | null;
  dict: Dictionary;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(editReply, undefined);
  const [image, setImage] = useState(initialImage ?? "");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  function addImage() {
    const url = window.prompt(dict.post.addImage, "https://");
    if (url && /^https?:\/\//i.test(url.trim())) setImage(url.trim());
  }

  return (
    <form action={action} className="reply-composer">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="replyId" value={replyId} />
      {image && <input type="hidden" name="image" value={image} />}

      <textarea
        name="body"
        rows={3}
        className="reply-textarea"
        defaultValue={initialText}
        autoFocus
      />

      {image && (
        <div className="reply-image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" />
          <button type="button" className="action" onClick={() => setImage("")}>
            ✕ {dict.post.removeImage}
          </button>
        </div>
      )}

      {state?.message && <p className="field-error">{state.message}</p>}
      {state?.errors?.body && <p className="field-error">{state.errors.body.join(" ")}</p>}

      <div className="reply-composer-actions">
        <button type="button" className="btn btn-ghost" onClick={addImage}>
          🖼 {dict.post.addImage}
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {dict.post.save}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {dict.common.cancel}
        </button>
      </div>
    </form>
  );
}
