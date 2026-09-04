"use client";

import Link from "@/components/Link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  adminCreateUser,
  setUserRole,
  setUserStatus,
  setUserDonor,
  setUserPro,
  setUserSupporter,
  setUserAdminAccess,
  setUserAiAsk,
  setUserAiTranslate,
} from "@/app/actions/admin-users";
import { hasAiAccess, hasAiTranslate } from "@/lib/perks";
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
  aiAsk: boolean;
  aiTranslate: boolean;
  featureKeys: string[];
};

// One AI tool's cell. A tool the user already holds through a tier or package
// isn't a toggle — turning it "off" here couldn't take it away, so the cell
// says where it came from instead, the same way the admin-access column marks
// an ADMIN as always having the panel.
function AiCell({
  on,
  viaPlan,
  label,
  hint,
  planLabel,
  planHint,
  pending,
  onToggle,
}: {
  on: boolean;
  viaPlan: boolean;
  label: string;
  hint: string;
  planLabel: string;
  planHint: string;
  pending: boolean;
  onToggle: () => void;
}) {
  if (viaPlan) {
    return <span className="opacity-50" title={planHint}>✦ {planLabel}</span>;
  }
  return (
    <button type="button" className="action" disabled={pending} title={hint} onClick={onToggle}>
      {on ? "✦ " + label : "— " + label}
    </button>
  );
}

function UserRow({
  user,
  n,
  isSelf,
  dict,
  locale,
}: {
  user: AdminUser;
  n: number;
  isSelf: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const archived = user.status === "ARCHIVED";

  return (
    <tr>
      <td className="admin-rownum">{n}</td>
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
        <AiCell
          on={user.aiAsk}
          viaPlan={hasAiAccess({ ...user, aiAsk: false })}
          label={t.aiAsk}
          hint={t.aiAskHint}
          planLabel={t.aiViaPlan}
          planHint={t.aiViaPlanHint}
          pending={pending}
          onToggle={() => startTransition(() => void setUserAiAsk(user.id, !user.aiAsk))}
        />
      </td>
      <td>
        <AiCell
          on={user.aiTranslate}
          viaPlan={hasAiTranslate({ ...user, aiTranslate: false })}
          label={t.aiTranslate}
          hint={t.aiTranslateHint}
          planLabel={t.aiViaPlan}
          planHint={t.aiViaPlanHint}
          pending={pending}
          onToggle={() => startTransition(() => void setUserAiTranslate(user.id, !user.aiTranslate))}
        />
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
  q,
  total,
}: {
  dict: Dictionary;
  users: AdminUser[];
  currentUserId: string;
  locale: Locale;
  q: string;
  total: number;
}) {
  const t = dict.admin;
  const [adding, setAdding] = useState(false);
  // Rows are numbered as displayed (newest first), so the last number is also
  // how many accounts matched — and `total` says whether more went unshown.
  const shown = users.length;
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

      <form method="get" className="admin-filter-row">
        <input className="input" name="q" placeholder={t.searchUsers} defaultValue={q} />
        <button type="submit" className="btn btn-ghost btn-sm">{dict.business.search}</button>
        {q && (
          <Link href={`/${locale}/admin/users`} className="btn btn-ghost btn-sm">
            {t.activity.reset}
          </Link>
        )}
        <span className="muted-sm">
          {shown < total
            ? t.usersShowing.replace("{shown}", String(shown)).replace("{total}", String(total))
            : t.usersTotal.replace("{n}", String(total))}
        </span>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-rownum">#</th>
            <th>{t.id}</th>
            <th>{dict.auth.forumName}</th>
            <th>{dict.auth.email}</th>
            <th>{t.role}</th>
            <th>{t.status}</th>
            <th>{t.donor}</th>
            <th>{t.pro}</th>
            <th>{t.supporter}</th>
            <th>{t.aiAsk}</th>
            <th>{t.aiTranslate}</th>
            <th>{t.adminAccess}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <UserRow key={u.id} user={u} n={i + 1} isSelf={u.id === currentUserId} dict={dict} locale={locale} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={13} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {t.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
