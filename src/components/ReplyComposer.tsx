"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createReply } from "@/app/actions/replies";
import { ImagePicker } from "@/components/ImagePicker";
import { IdentityPicker, type AliasOption } from "@/components/IdentityPicker";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function ReplyComposer({
  locale,
  slug,
  postId,
  parentId,
  dict,
  autoFocus,
  onDone,
  realName,
  aliases,
}: {
  locale: Locale;
  slug: string;
  postId: string;
  parentId?: string;
  dict: Dictionary;
  autoFocus?: boolean;
  onDone?: () => void;
  realName: string;
  aliases: AliasOption[];
}) {
  const [state, action, pending] = useActionState(createReply, undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [image, setImage] = useState("");

  useEffect(() => {
    if (state?.ok) {
      if (ref.current) ref.current.value = "";
      setImage("");
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form action={action} className="reply-composer">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      {image && <input type="hidden" name="image" value={image} />}

      <div className="reply-identity-row">
        <IdentityPicker realName={realName} aliases={aliases} dict={dict} />
      </div>

      <textarea
        ref={ref}
        name="body"
        rows={3}
        className="reply-textarea"
        placeholder={dict.post.writeReply}
        autoFocus={autoFocus}
      />

      <ImagePicker value={image} onChange={setImage} dict={dict} />

      {state?.message && <p className="field-error">{state.message}</p>}
      {state?.errors?.body && <p className="field-error">{state.errors.body.join(" ")}</p>}

      <div className="reply-composer-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {dict.post.reply}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn btn-ghost">
            {dict.common.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
