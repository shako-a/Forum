"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createAdCard, updateAdCard, deleteAdCard, toggleAdCard } from "@/app/actions/admin-ads";
import { UploadField } from "@/components/UploadField";
import { CroppedUploadField, AD_ASPECT } from "@/components/CroppedUploadField";
import type { Dictionary } from "@/i18n/dictionaries";

export type AdminAdCard = {
  id: string;
  titleEn: string;
  titleKa: string;
  titleColor: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  placement: "TOP_PANEL" | "SIDEBAR";
  active: boolean;
  sortOrder: number;
};

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

function AdCardForm({
  dict,
  card,
  onDone,
}: {
  dict: Dictionary;
  card?: AdminAdCard;
  onDone: () => void;
}) {
  const t = dict.admin;
  const isEdit = !!card;
  const [state, action, pending] = useActionState(isEdit ? updateAdCard : createAdCard, undefined);
  // Controlled so the Upload buttons can fill them (and preview).
  const [imageUrl, setImageUrl] = useState(card?.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(card?.videoUrl ?? "");
  // Placement drives the crop aspect ratio (each card type has its own shape).
  const [placement, setPlacement] = useState<"TOP_PANEL" | "SIDEBAR">(card?.placement ?? "TOP_PANEL");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="card card-pad admin-form">
      {isEdit && <input type="hidden" name="id" value={card.id} />}
      {state?.message && <p className="auth-alert" role="alert">{state.message}</p>}

      <div className="field-row">
        <div className="field">
          <label>{t.titleEn}<span className="req">*</span></label>
          <input name="titleEn" className="input" defaultValue={card?.titleEn ?? ""} required />
          <FieldError msgs={state?.errors?.titleEn} />
        </div>
        <div className="field">
          <label>{t.titleKa}<span className="req">*</span></label>
          <input name="titleKa" className="input" defaultValue={card?.titleKa ?? ""} required />
          <FieldError msgs={state?.errors?.titleKa} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t.imageUrl}</label>
          <div className="upload-row">
            <input
              name="imageUrl"
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
            <CroppedUploadField
              aspect={AD_ASPECT[placement]}
              label={t.upload}
              busyLabel={t.uploading}
              dict={dict}
              onUploaded={setImageUrl}
            />
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ad-upload-preview" src={imageUrl} alt="" />
          )}
          <FieldError msgs={state?.errors?.imageUrl} />
        </div>
        <div className="field">
          <label>{t.videoUrl}</label>
          <div className="upload-row">
            <input
              name="videoUrl"
              className="input"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://… .mp4"
            />
            <UploadField
              accept="video/*"
              label={t.upload}
              busyLabel={t.uploading}
              onUploaded={setVideoUrl}
            />
          </div>
          {videoUrl && <video className="ad-upload-preview" src={videoUrl} muted controls />}
          <FieldError msgs={state?.errors?.videoUrl} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t.linkUrl}</label>
          <input name="linkUrl" className="input" defaultValue={card?.linkUrl ?? ""} placeholder="https://…" />
          <FieldError msgs={state?.errors?.linkUrl} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t.placement}</label>
          <select
            name="placement"
            className="input"
            value={placement}
            onChange={(e) => setPlacement(e.target.value as "TOP_PANEL" | "SIDEBAR")}
          >
            <option value="TOP_PANEL">{t.topPanel}</option>
            <option value="SIDEBAR">{t.sidebar}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.position}</label>
          <input name="sortOrder" type="number" min={0} className="input" defaultValue={card?.sortOrder ?? 0} />
          <p className="field-hint">{t.positionHint}</p>
        </div>
        <div className="field admin-color-field">
          <label>{t.titleColor}</label>
          <input
            name="titleColor"
            type="color"
            className="input admin-color-input"
            defaultValue={card?.titleColor ?? "#ffffff"}
          />
        </div>
      </div>

      <label className="admin-check">
        <input type="checkbox" name="active" defaultChecked={card?.active ?? true} />
        <span>{t.active}</span>
      </label>

      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {isEdit ? t.save : t.create}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

export function AdCardAdmin({ dict, cards }: { dict: Dictionary; cards: AdminAdCard[] }) {
  const t = dict.admin;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    startTransition(() => void deleteAdCard(id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="admin-h1">{t.adCards}</h1>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.newAdCard}
          </button>
        )}
      </div>

      {creating && <AdCardForm dict={dict} onDone={() => setCreating(false)} />}

      <div className="flex flex-col gap-3">
        {cards.map((card) =>
          editingId === card.id ? (
            <AdCardForm key={card.id} dict={dict} card={card} onDone={() => setEditingId(null)} />
          ) : (
            <div key={card.id} className="card card-pad admin-row">
              <div className="admin-row-head">
                <div>
                  <span className="font-medium">{card.titleEn}</span>
                  <span className="opacity-50"> · {card.titleKa}</span>
                </div>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="action"
                    disabled={pending}
                    onClick={() => startTransition(() => void toggleAdCard(card.id, !card.active))}
                  >
                    {card.active ? "✓ " + t.active : "— " + t.active}
                  </button>
                  <button type="button" className="action" onClick={() => setEditingId(card.id)}>
                    {t.edit}
                  </button>
                  <button type="button" className="action mod-action" disabled={pending} onClick={() => onDelete(card.id)}>
                    {t.delete}
                  </button>
                </div>
              </div>
              <div className="admin-row-meta">
                <span className="opacity-60">{card.placement === "TOP_PANEL" ? t.topPanel : t.sidebar}</span>
                <span className="sep">·</span>
                <span className="opacity-60">{t.sortOrder}: {card.sortOrder}</span>
                {card.linkUrl && (
                  <>
                    <span className="sep">·</span>
                    <a href={card.linkUrl} target="_blank" rel="noreferrer" className="opacity-60 underline">
                      {t.linkUrl}
                    </a>
                  </>
                )}
              </div>
            </div>
          ),
        )}
        {cards.length === 0 && <p className="opacity-50">{t.empty}</p>}
      </div>
    </div>
  );
}
