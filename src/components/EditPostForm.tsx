"use client";

import { useActionState, useState } from "react";
import { editPost } from "@/app/actions/posts";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Cat = { id: string; name: string };

export function EditPostForm({
  locale,
  dict,
  postId,
  categories,
  currentCategoryId,
  title,
  bodyDoc,
}: {
  locale: Locale;
  dict: Dictionary;
  postId: string;
  categories: Cat[];
  currentCategoryId: string;
  title: string;
  bodyDoc: string;
}) {
  const [state, action, pending] = useActionState(editPost, undefined);
  const err = state?.errors;
  const [image, setImage] = useState("");

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="postId" value={postId} />
      {image && <input type="hidden" name="image" value={image} />}

      <h1 className="auth-title" style={{ textAlign: "left", marginBottom: 18 }}>
        {dict.post.editPost}
      </h1>
      {state?.message && <p className="auth-alert" role="alert">{state.message}</p>}

      <div className="field">
        <label htmlFor="categoryId">{dict.post.chooseCategory}</label>
        <select id="categoryId" name="categoryId" className="create-select" defaultValue={currentCategoryId}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {err?.categoryId && <span className="field-error">{err.categoryId.join(" ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="title">{dict.post.title}</label>
        <input
          id="title"
          name="title"
          className="create-title-input"
          defaultValue={title}
          maxLength={300}
        />
        {err?.title && <span className="field-error">{err.title.join(" ")}</span>}
      </div>

      <div className="field">
        <label>{dict.post.body}</label>
        <RichTextEditor
          name="body"
          placeholder={dict.post.body}
          initialDoc={bodyDoc}
          spacing={{
            label: dict.post.lineSpacing,
            normal: dict.post.spacingNormal,
            tight: dict.post.spacingTight,
            relaxed: dict.post.spacingRelaxed,
          }}
        />
        {err?.body && <span className="field-error">{err.body.join(" ")}</span>}
      </div>

      <div className="field">
        <ImagePicker value={image} onChange={setImage} dict={dict} />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary btn-full">
        {dict.profile.save}
      </button>
    </form>
  );
}
