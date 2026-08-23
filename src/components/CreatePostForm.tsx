"use client";

import { useActionState, useState } from "react";
import { createPost } from "@/app/actions/posts";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import { IdentityPicker, type AliasOption } from "@/components/IdentityPicker";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Cat = { id: string; name: string };

export function CreatePostForm({
  locale,
  dict,
  categories,
  defaultCategoryId,
  realName,
  aliases,
  actingAs,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Cat[];
  defaultCategoryId?: string;
  realName: string;
  aliases: AliasOption[];
  actingAs?: string | null;
}) {
  const [state, action, pending] = useActionState(createPost, undefined);
  const err = state?.errors;
  const [image, setImage] = useState("");

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      {image && <input type="hidden" name="image" value={image} />}
      <h1 className="auth-title" style={{ textAlign: "left", marginBottom: 18 }}>
        {dict.home.createPost}
      </h1>

      <div className="field">
        <label>{dict.post.postingAs}</label>
        <IdentityPicker realName={realName} aliases={aliases} dict={dict} actingAs={actingAs} />
      </div>

      <div className="field">
        <label htmlFor="categoryId">{dict.post.chooseCategory}</label>
        <select
          id="categoryId"
          name="categoryId"
          className="create-select"
          defaultValue={defaultCategoryId ?? ""}
        >
          <option value="" disabled>
            {dict.post.chooseCategory}
          </option>
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
          placeholder={dict.post.title}
          maxLength={300}
        />
        {err?.title && <span className="field-error">{err.title.join(" ")}</span>}
      </div>

      <div className="field">
        <label>{dict.post.body}</label>
        <RichTextEditor
          name="body"
          placeholder={dict.post.body}
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
        {dict.common.post}
      </button>
    </form>
  );
}
