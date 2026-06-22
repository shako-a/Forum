"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  assignCategoryModerator,
  removeCategoryModerator,
} from "@/app/actions/admin-categories";
import type { Dictionary } from "@/i18n/dictionaries";

export type AdminCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string | null;
  descriptionKa: string | null;
  locked: boolean;
  sortOrder: number;
  postCount: number;
  moderators: { id: string; forumName: string }[];
};

export type MemberOption = { id: string; forumName: string };

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="field-error">{msgs[0]}</p>;
}

// Create/edit form. `category` undefined → create mode.
function CategoryForm({
  dict,
  category,
  onDone,
}: {
  dict: Dictionary;
  category?: AdminCategory;
  onDone: () => void;
}) {
  const t = dict.admin;
  const isEdit = !!category;
  const [state, action, pending] = useActionState(
    isEdit ? updateCategory : createCategory,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="card card-pad admin-form">
      {isEdit && <input type="hidden" name="id" value={category.id} />}
      {state?.message && <p className="auth-alert" role="alert">{state.message}</p>}

      <div className="field-row">
        <div className="field">
          <label>{t.nameEn}<span className="req">*</span></label>
          <input name="nameEn" className="input" defaultValue={category?.nameEn ?? ""} required />
          <FieldError msgs={state?.errors?.nameEn} />
        </div>
        <div className="field">
          <label>{t.nameKa}<span className="req">*</span></label>
          <input name="nameKa" className="input" defaultValue={category?.nameKa ?? ""} required />
          <FieldError msgs={state?.errors?.nameKa} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t.slug}</label>
          <input name="slug" className="input" defaultValue={category?.slug ?? ""} placeholder={t.slugHint} />
          <FieldError msgs={state?.errors?.slug} />
        </div>
        <div className="field">
          <label>{t.sortOrder}</label>
          <input name="sortOrder" type="number" className="input" defaultValue={category?.sortOrder ?? 0} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t.descriptionEn}</label>
          <input name="descriptionEn" className="input" defaultValue={category?.descriptionEn ?? ""} />
        </div>
        <div className="field">
          <label>{t.descriptionKa}</label>
          <input name="descriptionKa" className="input" defaultValue={category?.descriptionKa ?? ""} />
        </div>
      </div>

      <label className="admin-check">
        <input type="checkbox" name="locked" defaultChecked={category?.locked ?? false} />
        <span>{t.locked}</span>
      </label>
      <p className="field-hint">{t.lockedHint}</p>

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

// Moderator chips + an "assign" dropdown for one category.
function ModeratorPicker({
  dict,
  category,
  members,
}: {
  dict: Dictionary;
  category: AdminCategory;
  members: MemberOption[];
}) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");

  const assignedIds = new Set(category.moderators.map((m) => m.id));
  const available = members.filter((m) => !assignedIds.has(m.id));

  function assign() {
    if (!pick) return;
    const userId = pick;
    setPick("");
    startTransition(() => void assignCategoryModerator(category.id, userId));
  }

  return (
    <div className="mod-picker">
      <div className="mod-chips">
        {category.moderators.length === 0 && <span className="muted-sm">{t.noModerators}</span>}
        {category.moderators.map((m) => (
          <span key={m.id} className="chip chip-neutral">
            {m.forumName}
            <button
              type="button"
              className="chip-x"
              aria-label={`Remove ${m.forumName}`}
              disabled={pending}
              onClick={() => startTransition(() => void removeCategoryModerator(category.id, m.id))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <div className="mod-assign">
          <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{t.selectUser}</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>{m.forumName}</option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" disabled={!pick || pending} onClick={assign}>
            {t.assignModerator}
          </button>
        </div>
      )}
    </div>
  );
}

export function CategoryAdmin({
  dict,
  categories,
  members,
}: {
  dict: Dictionary;
  categories: AdminCategory[];
  members: MemberOption[];
}) {
  const t = dict.admin;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete(c: AdminCategory) {
    if (c.postCount > 0) return;
    if (!window.confirm(t.confirmDelete)) return;
    startTransition(() => void deleteCategory(c.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="admin-h1">{t.categories}</h1>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.newCategory}
          </button>
        )}
      </div>

      {creating && <CategoryForm dict={dict} onDone={() => setCreating(false)} />}

      <div className="flex flex-col gap-3">
        {categories.map((c) =>
          editingId === c.id ? (
            <CategoryForm key={c.id} dict={dict} category={c} onDone={() => setEditingId(null)} />
          ) : (
            <div key={c.id} className="card card-pad admin-row">
              <div className="admin-row-head">
                <div>
                  <span className="font-medium">{c.nameEn}</span>
                  <span className="opacity-50"> · {c.nameKa}</span>
                  {c.locked && <span className="ml-2">🔒</span>}
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="action" onClick={() => setEditingId(c.id)}>
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    className="action mod-action"
                    disabled={c.postCount > 0 || pending}
                    title={c.postCount > 0 ? t.deleteCategoryBlocked : undefined}
                    onClick={() => onDelete(c)}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
              <div className="admin-row-meta">
                <span className="opacity-60">/{c.slug}</span>
                <span className="sep">·</span>
                <span className="opacity-60">{c.postCount} {t.posts}</span>
                <span className="sep">·</span>
                <span className="opacity-60">{t.sortOrder}: {c.sortOrder}</span>
              </div>
              <div className="admin-row-mods">
                <span className="admin-row-mods-label">{t.moderators}</span>
                <ModeratorPicker dict={dict} category={c} members={members} />
              </div>
            </div>
          ),
        )}
        {categories.length === 0 && <p className="opacity-50">{t.empty}</p>}
      </div>
    </div>
  );
}
