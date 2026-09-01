"use client";

import Link from "@/components/Link";
import { useActionState, useState, useTransition } from "react";
import { adminUpdateUser } from "@/app/actions/admin-users";
import { setUserPackage } from "@/app/actions/admin-packages";
import { LabelBadge, type BadgeLabel } from "@/components/LabelBadge";
import { StateSelect } from "@/components/StateSelect";
import { AdminPasswordReset } from "@/components/admin/AdminPasswordReset";
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
  isPro: boolean;
  isSupporter: boolean;
  canAccessAdmin: boolean;
  canRevealAnon: boolean;
  isOwner: boolean;
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

// Packages an admin created (the three built-ins have their own checkboxes in
// the form above, since those are carried by User booleans). Each toggle
// commits on click rather than waiting for the form to be saved.
function CustomPackageGrants({
  userId,
  packages,
  held,
  dict,
}: {
  userId: string;
  packages: { id: string; name: string; icon: string }[];
  held: string[];
  dict: Dictionary;
}) {
  const t = dict.admin.pkg;
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState<Set<string>>(new Set(held));
  if (packages.length === 0) return null;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">{t.packages}</h2>
      <div className="tier-grid">
        {packages.map((p) => {
          const has = on.has(p.id);
          return (
            <div className="tier-box" key={p.id}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={has}
                  disabled={pending}
                  onChange={() => {
                    setOn((prev) => {
                      const next = new Set(prev);
                      if (has) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    });
                    startTransition(() => void setUserPackage(userId, p.id, !has));
                  }}
                />
                {p.icon} {p.name}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminUserEdit({
  locale,
  dict,
  user,
  labels,
  assignedLabelIds,
  customPackages,
  heldPackageIds,
}: {
  locale: Locale;
  dict: Dictionary;
  user: AdminUserDetail;
  labels: AssignableLabel[];
  assignedLabelIds: string[];
  /** Admin-created packages (built-ins have their own checkboxes above). */
  customPackages: { id: string; name: string; icon: string }[];
  heldPackageIds: string[];
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
            {user.isPro && <span className="pro-badge">💼 {dict.profile.proBadge}</span>}
            {user.isSupporter && (
              <span className="supporter-badge">🤍 {dict.profile.supporterBadge}</span>
            )}
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
          <StateSelect
            name="state"
            label={ta.state}
            locale={locale}
            defaultValue={user.state}
            usGroupLabel={ta.usStates}
            error={err?.state}
          />
        </div>

        <div className="tier-grid">
          <div className="tier-box">
            <label className="checkbox-row" title={t.donorHint}>
              <input type="checkbox" name="isDonor" defaultChecked={user.isDonor} />
              💛 {t.donor}
            </label>
          </div>
          <div className="tier-box">
            <label className="checkbox-row" title={t.proHint}>
              <input type="checkbox" name="isPro" defaultChecked={user.isPro} />
              💼 {t.pro}
            </label>
          </div>
          <div className="tier-box">
            <label className="checkbox-row" title={t.supporterHint}>
              <input type="checkbox" name="isSupporter" defaultChecked={user.isSupporter} />
              🤍 {t.supporter}
            </label>
          </div>
        </div>

        {/* Per-staff permission: see real authors behind anonymous content.
            Only meaningful for moderators/admins; the owner always can. */}
        {!user.isOwner && (user.role === "MODERATOR" || user.role === "ADMIN") && (
          <div className="tier-box" style={{ marginTop: 2 }}>
            <label className="checkbox-row" title={t.canRevealAnonHint}>
              <input type="checkbox" name="canRevealAnon" defaultChecked={user.canRevealAnon} />
              🕵 {t.canRevealAnon}
            </label>
            <p className="muted-sm" style={{ marginTop: 6 }}>{t.canRevealAnonHint}</p>
          </div>
        )}

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

      <CustomPackageGrants
        userId={user.id}
        packages={customPackages}
        held={heldPackageIds}
        dict={dict}
      />

      <AdminPasswordReset userId={user.id} dict={dict} />
    </div>
  );
}
