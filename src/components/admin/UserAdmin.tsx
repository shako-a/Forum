"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  adminCreateUser,
  setUserRole,
  setUserStatus,
  setUserDonor,
  setUserPro,
  setUserSupporter,
  setUserAdminAccess,
} from "@/app/actions/admin-users";
import { IdCell } from "@/components/admin/IdCell";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Role, UserStatus } from "@/generated/prisma/client";

export type AdminUser = {
  id: string;
  forumName: string;
  email: string;
  role: Role;
  status: UserStatus;
  isDonor: boolean;
  isPro: boolean;
  isSupporter: boolean;
  canAccessAdmin: boolean;
};

function UserRow({
  user,
  isSelf,
  dict,
  locale,
}: {
  user: AdminUser;
  isSelf: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const archived = user.status === "ARCHIVED";

  return (
    <tr>
      <td><IdCell id={user.id} /></td>
      <td>
        <Link href={`/${locale}/admin/users/${user.id}`} className="admin-user-link">
          {user.forumName}
        </Link>
        {isSelf && <span className="muted-sm"> (you)</span>}
      </td>
      <td style={{ color: "var(--muted)" }}>{user.email}</td>
      <td>
        <select
          className="input admin-inline-select"
          value={user.role}
          disabled={isSelf || pending}
          title={isSelf ? t.selfActionBlocked : t.changeRole}
          onChange={(e) =>
            startTransition(() => void setUserRole(user.id, e.target.value as Role))
          }
        >
          <option value="USER">{dict.roles.user}</option>
          <option value="MODERATOR">{dict.roles.moderator}</option>
          <option value="ADMIN">{dict.roles.admin}</option>
        </select>
      </td>
      <td>
        <span className={archived ? "opacity-50" : ""}>
          {archived ? t.archived : t.active}
        </span>
      </td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          title={t.donorHint}
          onClick={() => startTransition(() => void setUserDonor(user.id, !user.isDonor))}
        >
          {user.isDonor ? "💛 " + t.donor : "— " + t.donor}
        </button>
      </td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          title={t.proHint}
          onClick={() => startTransition(() => void setUserPro(user.id, !user.isPro))}
        >
          {user.isPro ? "💼 " + t.pro : "— " + t.pro}
        </button>
      </td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          title={t.supporterHint}
          onClick={() => startTransition(() => void setUserSupporter(user.id, !user.isSupporter))}
        >
          {user.isSupporter ? "🤍 " + t.supporter : "— " + t.supporter}
        </button>
      </td>
      <td>
        {user.role === "ADMIN" ? (
          <span className="opacity-50" title={t.adminAccessHint}>🛡 {t.always}</span>
        ) : user.role === "MODERATOR" ? (
          <button
            type="button"
            className="action"
            disabled={pending}
            title={t.adminAccessHint}
            onClick={() => startTransition(() => void setUserAdminAccess(user.id, !user.canAccessAdmin))}
          >
            {user.canAccessAdmin ? "🛡 " + t.adminAccess : "— " + t.adminAccess}
          </button>
        ) : (
          <span className="opacity-30">—</span>
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        <button
          type="button"
          className="action mod-action"
          disabled={isSelf || pending}
          title={isSelf ? t.selfActionBlocked : undefined}
          onClick={() =>
            startTransition(() =>
              void setUserStatus(user.id, (archived ? "ACTIVE" : "ARCHIVED") as UserStatus),
            )
          }
        >
          {archived ? t.restore : t.archive}
        </button>
      </td>
    </tr>
  );
}

function AddUserForm({ dict, onDone }: { dict: Dictionary; onDone: () => void }) {
  const t = dict.admin;
  const a = dict.auth;
  const [state, action, pending] = useActionState(adminCreateUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Close and reset once the account is created (the table revalidates itself).
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  const err = state?.errors;
  return (
    <form ref={formRef} action={action} className="admin-add-form">
      <p className="muted-sm" style={{ margin: "0 0 12px" }}>{t.addUserHint}</p>
      <div className="admin-add-grid">
        <label>
          <span>{a.email}</span>
          <input className="input" type="email" name="email" autoComplete="off" required />
          {err?.email && <span className="field-error">{err.email[0]}</span>}
        </label>
        <label>
          <span>{a.forumName}</span>
          <input className="input" type="text" name="forumName" autoComplete="off" required />
          {err?.forumName && <span className="field-error">{err.forumName[0]}</span>}
        </label>
        <label>
          <span>{a.password}</span>
          <input className="input" type="text" name="password" autoComplete="off" required />
          {err?.password && <span className="field-error">{err.password[0]}</span>}
        </label>
        <label>
          <span>{t.roleLabel}</span>
          <select className="input" name="role" defaultValue="USER">
            <option value="USER">{dict.roles.user}</option>
            <option value="MODERATOR">{dict.roles.moderator}</option>
            <option value="ADMIN">{dict.roles.admin}</option>
          </select>
        </label>
      </div>
      {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
      <div className="admin-add-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.create}
        </button>
        <button type="button" className="btn" onClick={onDone} disabled={pending}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

export function UserAdmin({
  dict,
  users,
  currentUserId,
  locale,
}: {
  dict: Dictionary;
  users: AdminUser[];
  currentUserId: string;
  locale: Locale;
}) {
  const t = dict.admin;
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="admin-list-head">
        <h1 className="admin-h1" style={{ margin: 0 }}>{t.users}</h1>
        {!adding && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            + {t.addUser}
          </button>
        )}
      </div>
      {adding && <AddUserForm dict={dict} onDone={() => setAdding(false)} />}
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t.id}</th>
            <th>{dict.auth.forumName}</th>
            <th>{dict.auth.email}</th>
            <th>{t.role}</th>
            <th>{t.status}</th>
            <th>{t.donor}</th>
            <th>{t.pro}</th>
            <th>{t.supporter}</th>
            <th>{t.adminAccess}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} dict={dict} locale={locale} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {t.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
