"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createLabel, updateLabel, deleteLabel } from "@/app/actions/admin-labels";
import { LabelBadge } from "@/components/LabelBadge";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminLabel = {
  id: string;
  nameEn: string;
  nameKa: string;
  color: string;
  background: string;
  font: string;
  bold: boolean;
  sortOrder: number;
  userCount: number;
};

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

function LabelForm({
  locale,
  dict,
  label,
  onDone,
}: {
  locale: Locale;
  dict: Dictionary;
  label?: AdminLabel;
  onDone: () => void;
}) {
  const t = dict.admin;
  const isEdit = !!label;
  const [state, action, pending] = useActionState(isEdit ? updateLabel : createLabel, undefined);

  // Controlled so the preview updates live.
  const [nameEn, setNameEn] = useState(label?.nameEn ?? "");
  const [nameKa, setNameKa] = useState(label?.nameKa ?? "");
  const [color, setColor] = useState(label?.color ?? "#1f4e9c");
  const [background, setBackground] = useState(label?.background ?? "#eaf1fb");
  const [font, setFont] = useState(label?.font ?? "body");
  const [bold, setBold] = useState(label?.bold ?? true);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const preview = {
    nameEn: nameEn || "Label",
    nameKa: nameKa || "ნიშნული",
    color,
    background,
    font,
    bold,
  };

  return (
    <form action={action} className="card card-pad admin-form">
      {isEdit && <input type="hidden" name="id" value={label.id} />}
      {state?.message && (
        <p className="auth-alert" role="alert">
          {state.message}
        </p>
      )}

      <div className="label-preview">
        <span className="muted-sm">{t.preview}</span>
        <LabelBadge label={preview} locale={locale} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>
            {t.nameEn}
            <span className="req">*</span>
          </label>
          <input className="input" name="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
          <FieldError msgs={state?.errors?.nameEn} />
        </div>
        <div className="field">
          <label>
            {t.nameKa}
            <span className="req">*</span>
          </label>
          <input className="input" name="nameKa" value={nameKa} onChange={(e) => setNameKa(e.target.value)} required />
          <FieldError msgs={state?.errors?.nameKa} />
        </div>
      </div>

      <div className="field-row">
        <div className="field admin-color-field">
          <label>{t.textColor}</label>
          <input
            className="input admin-color-input"
            name="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className="field admin-color-field">
          <label>{t.bgColor}</label>
          <input
            className="input admin-color-input"
            name="background"
            type="color"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t.font}</label>
          <select className="input" name="font" value={font} onChange={(e) => setFont(e.target.value)}>
            <option value="body">{t.fontBody}</option>
            <option value="display">{t.fontDisplay}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.position}</label>
          <input className="input" name="sortOrder" type="number" defaultValue={label?.sortOrder ?? 0} />
        </div>
      </div>

      <label className="admin-check">
        <input type="checkbox" name="bold" checked={bold} onChange={(e) => setBold(e.target.checked)} />
        <span>{t.bold}</span>
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

export function LabelAdmin({
  locale,
  dict,
  labels,
}: {
  locale: Locale;
  dict: Dictionary;
  labels: AdminLabel[];
}) {
  const t = dict.admin;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    startTransition(() => void deleteLabel(id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="admin-h1">{t.labels}</h1>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.newLabel}
          </button>
        )}
      </div>

      {/* Built-in label: Donor (auto-assigned to paid members, not editable here) */}
      <div className="card card-pad label-builtin">
        <span className="donor-badge">💛 {dict.profile.donorBadge}</span>
        <span className="muted-sm">{t.donorBuiltin}</span>
      </div>

      {creating && <LabelForm locale={locale} dict={dict} onDone={() => setCreating(false)} />}

      <div className="flex flex-col gap-3">
        {labels.map((label) =>
          editingId === label.id ? (
            <LabelForm key={label.id} locale={locale} dict={dict} label={label} onDone={() => setEditingId(null)} />
          ) : (
            <div key={label.id} className="card card-pad admin-row">
              <div className="admin-row-head">
                <div className="label-row-info">
                  <LabelBadge label={label} locale={locale} />
                  <span className="muted-sm">
                    {label.userCount} {t.assignedUsers}
                  </span>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="action" onClick={() => setEditingId(label.id)}>
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    className="action mod-action"
                    disabled={pending}
                    onClick={() => onDelete(label.id)}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ),
        )}
        {labels.length === 0 && <p className="opacity-50">{t.noLabels}</p>}
      </div>
    </div>
  );
}
