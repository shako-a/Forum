"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setUserRole, setUserStatus, setUserDonor, setUserAdminAccess } from "@/app/actions/admin-users";
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
  return (
    <div>
      <h1 className="admin-h1">{t.users}</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{dict.auth.forumName}</th>
            <th>{dict.auth.email}</th>
            <th>{t.role}</th>
            <th>{t.status}</th>
            <th>{t.donor}</th>
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
              <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {t.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
