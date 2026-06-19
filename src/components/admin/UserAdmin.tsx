"use client";

import { useTransition } from "react";
import { setUserRole, setUserStatus, setUserDonor } from "@/app/actions/admin-users";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Role, UserStatus } from "@/generated/prisma/client";

export type AdminUser = {
  id: string;
  forumName: string;
  email: string;
  role: Role;
  status: UserStatus;
  isDonor: boolean;
};

function UserRow({
  user,
  isSelf,
  dict,
}: {
  user: AdminUser;
  isSelf: boolean;
  dict: Dictionary;
}) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const archived = user.status === "ARCHIVED";

  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      <td className="py-2">
        {user.forumName}
        {isSelf && <span className="opacity-40"> (you)</span>}
      </td>
      <td className="py-2 opacity-60">{user.email}</td>
      <td className="py-2">
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
      <td className="py-2">
        <span className={archived ? "opacity-50" : ""}>
          {archived ? t.archived : t.active}
        </span>
      </td>
      <td className="py-2">
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
      <td className="py-2 text-right">
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
}: {
  dict: Dictionary;
  users: AdminUser[];
  currentUserId: string;
}) {
  const t = dict.admin;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t.users}</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-left opacity-60">
            <th className="py-2">{dict.auth.forumName}</th>
            <th className="py-2">{dict.auth.email}</th>
            <th className="py-2">{t.role}</th>
            <th className="py-2">{t.status}</th>
            <th className="py-2">{t.donor}</th>
            <th className="py-2 text-right">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} dict={dict} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center opacity-50">{t.empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
