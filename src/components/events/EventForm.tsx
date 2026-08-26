"use client";

import { useActionState, useState } from "react";
import { createEvent, editEvent } from "@/app/actions/events";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Cat = { id: string; name: string };

export type EventDefaults = {
  postId: string;
  title: string;
  categoryId: string;
  startsAt: string; // "YYYY-MM-DDTHH:mm"
  endsAt: string;
  location: string;
  url: string;
  bodyDoc: string;
};

// One form for both creating and editing an event — the fields are identical,
// only the action and the button label differ.
export function EventForm({
  locale,
  dict,
  categories,
  defaults,
  defaultCategoryId,
  actingAs,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Cat[];
  defaults?: EventDefaults;
  defaultCategoryId?: string;
  actingAs?: string | null;
}) {
  const editing = !!defaults;
  const [state, action, pending] = useActionState(editing ? editEvent : createEvent, undefined);
  const err = state?.errors;
  const [image, setImage] = useState("");
  const t = dict.events;

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      {defaults && <input type="hidden" name="postId" value={defaults.postId} />}
      {image && <input type="hidden" name="image" value={image} />}

      <h1 className="auth-title" style={{ textAlign: "left", marginBottom: 6 }}>
        {editing ? t.editTitle : t.createTitle}
      </h1>
      <p className="account-sub" style={{ marginTop: 0, marginBottom: 18 }}>{t.formSub}</p>
      {state?.message && <p className="auth-alert" role="alert">{state.message}</p>}
      {actingAs && <p className="muted-sm" style={{ marginBottom: 14 }}>🏢 {dict.post.postingAs}: <b>{actingAs}</b></p>}

      <div className="field">
        <label htmlFor="title">{t.name}</label>
        <input
          id="title"
          name="title"
          className="create-title-input"
          placeholder={t.namePlaceholder}
          defaultValue={defaults?.title}
          maxLength={300}
        />
        {err?.title && <span className="field-error">{err.title.join(" ")}</span>}
      </div>

      <div className="event-form-row">
        <div className="field">
          <label htmlFor="startsAt">{t.starts}</label>
          <input id="startsAt" name="startsAt" type="datetime-local" className="input" defaultValue={defaults?.startsAt} />
          {err?.startsAt && <span className="field-error">{err.startsAt.join(" ")}</span>}
        </div>
        <div className="field">
          <label htmlFor="endsAt">{t.ends} <span className="muted-sm">· {t.optional}</span></label>
          <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={defaults?.endsAt} />
          {err?.endsAt && <span className="field-error">{err.endsAt.join(" ")}</span>}
        </div>
      </div>
      <p className="field-hint" style={{ marginTop: -6, marginBottom: 14 }}>{t.timeNote}</p>

      <div className="field">
        <label htmlFor="location">{t.location} <span className="muted-sm">· {t.optional}</span></label>
        <input
          id="location"
          name="location"
          className="input"
          placeholder={t.locationPlaceholder}
          defaultValue={defaults?.location}
          maxLength={200}
        />
        {err?.location && <span className="field-error">{err.location.join(" ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="url">{t.link} <span className="muted-sm">· {t.optional}</span></label>
        <input
          id="url"
          name="url"
          className="input"
          type="url"
          placeholder="https://"
          defaultValue={defaults?.url}
          maxLength={500}
        />
        {err?.url && <span className="field-error">{err.url.join(" ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="categoryId">{dict.post.chooseCategory}</label>
        <select
          id="categoryId"
          name="categoryId"
          className="create-select"
          defaultValue={defaults?.categoryId ?? defaultCategoryId ?? ""}
        >
          <option value="" disabled>{dict.post.chooseCategory}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {err?.categoryId && <span className="field-error">{err.categoryId.join(" ")}</span>}
      </div>

      <div className="field">
        <label>{t.details}</label>
        <RichTextEditor
          name="body"
          placeholder={t.detailsPlaceholder}
          initialDoc={defaults?.bodyDoc}
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
        {editing ? dict.profile.save : t.publish}
      </button>
    </form>
  );
}
