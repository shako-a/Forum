"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminUpdateUser } from "@/app/actions/admin-users";
import { LabelBadge, type BadgeLabel } from "@/components/LabelBadge";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Role, UserStatus } from "@/generated/prisma/client";

export type AssignableLabel = BadgeLabel & { id: string };

export type AdminUserDetail = {
  id: string;
  forumName: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string | null;
  state: string;
  hideRealName: boolean;
  role: Role;
  status: UserStatus;
  isDonor: boolean;
  canAccessAdmin: boolean;
  createdAt: string; // ISO
  postCount: number;
  replyCount: number;
};

const AVATAR_COLORS = ["#d7263d", "#1f4e9c", "#2e8b57", "#b8860b", "#6a3d9c", "#0d8a8a"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function AdminUserEdit({
  locale,
  dict,
  user,
  labels,
  assignedLabelIds,
}: {
  locale: Locale;
  dict: Dictionary;
  user: AdminUserDetail;
  labels: AssignableLabel[];
  assignedLabelIds: string[];
}) {
  const t = dict.admin;
  const ta = dict.auth;
  const [state, action, pending] = useActionState(adminUpdateUser, undefined);
  const err = state?.errors;
  const assignedSet = new Set(assignedLabelIds);
  const assignedLabels = labels.filter((l) => assignedSet.has(l.id));

  const roleLabel =
    user.role === "ADMIN"
      ? dict.roles.admin
      : user.role === "MODERATOR"
        ? dict.roles.moderator
        : dict.roles.user;
  const memberSince = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(user.createdAt),
  );

  function Field({
    name,
    label,
    type = "text",
    required = true,
    defaultValue,
    autoComplete,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    defaultValue?: string;
    autoComplete?: string;
  }) {
    const msgs = err?.[name];
    return (
      <div className="field">
        <label htmlFor={name}>
          {label}
          {required && <span className="req">*</span>}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className="input"
          required={required}
          aria-invalid={msgs ? true : undefined}
        />
        {msgs && <span className="field-error">{msgs.join(" ")}</span>}
      </div>
    );
  }

  return (
    <div>
      <Link href={`/${locale}/admin/users`} className="admin-back-inline">
        ← {t.users}
      </Link>
      <h1 className="admin-h1">{t.editUser}</h1>

      {/* read-only context */}
      <div className="card card-pad profile-header" style={{ marginBottom: 16 }}>
        <span
          className="profile-avatar"
          style={{ background: avatarColor(user.forumName) }}
          aria-hidden="true"
        >
          {user.forumName.charAt(0).toUpperCase()}
        </span>
        <div className="profile-id">
          <h2 className="profile-name">
            {user.forumName}
            <span className="role-badge">{roleLabel}</span>
            {user.isDonor && <span className="donor-badge">💛 {dict.profile.donorBadge}</span>}
            {user.role === "MODERATOR" && user.canAccessAdmin && (
              <span className="role-badge">🛡 {t.adminAccess}</span>
            )}
            {assignedLabels.map((l) => (
              <LabelBadge key={l.id} label={l} locale={locale} />
            ))}
          </h2>
          <p className="profile-meta">
            <span>{user.email}</span>
            <span className="sep">·</span>
            <span>
              {dict.profile.memberSince} {memberSince}
            </span>
            <span className="sep">·</span>
            <span>
              {user.postCount} {dict.profile.posts}
            </span>
            <span className="sep">·</span>
            <span>{user.status === "ARCHIVED" ? t.archived : t.active}</span>
          </p>
        </div>
      </div>

      {/* editable profile */}
      <form
        action={action}
        onSubmit={(e) => {
          if (!window.confirm(t.confirmSave)) e.preventDefault();
        }}
        className="card card-pad admin-form"
      >
        <input type="hidden" name="userId" value={user.id} />

        {state?.ok && (
          <p className="auth-ok" role="status">
            ✓ {t.saved}
          </p>
        )}
        {state?.message && !state.ok && (
          <p className="auth-alert" role="alert">
            {state.message}
          </p>
        )}

        <Field name="forumName" label={ta.forumName} defaultValue={user.forumName} autoComplete="off" />

        <div className="field-row">
          <Field name="firstName" label={ta.firstName} defaultValue={user.firstName} />
          <Field name="lastName" label={ta.lastName} defaultValue={user.lastName} />
        </div>

        <label className="checkbox-row">
          <input type="checkbox" name="hideRealName" defaultChecked={user.hideRealName} />
          {ta.hideRealName}
        </label>

        <Field name="email" label={ta.email} type="email" defaultValue={user.email} />
        <Field name="phone" label={ta.phone} type="tel" defaultValue={user.phone} />

        <div className="field-row">
          <Field name="city" label={ta.city} required={false} defaultValue={user.city ?? ""} />
          <Field name="state" label={ta.state} defaultValue={user.state} />
        </div>

        <label className="checkbox-row" title={t.donorHint}>
          <input type="checkbox" name="isDonor" defaultChecked={user.isDonor} />
          💛 {t.donor}
        </label>

        {labels.length > 0 && (
          <div className="field">
            <label>{t.labels}</label>
            <div className="label-assign">
              {labels.map((l) => (
                <label key={l.id} className="label-assign-item">
                  <input
                    type="checkbox"
                    name="labelIds"
                    value={l.id}
                    defaultChecked={assignedSet.has(l.id)}
                  />
                  <LabelBadge label={l} locale={locale} />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {dict.profile.save}
          </button>
          <Link href={`/${locale}/admin/users`} className="btn btn-ghost">
            {t.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
