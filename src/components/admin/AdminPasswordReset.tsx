"use client";

import { useActionState, useState } from "react";
import { setUserPassword } from "@/app/actions/admin-users";
import type { Dictionary } from "@/i18n/dictionaries";

// Strong, unambiguous random password (no easily-confused chars).
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function AdminPasswordReset({ userId, dict }: { userId: string; dict: Dictionary }) {
  const t = dict.admin;
  const [state, action, pending] = useActionState(setUserPassword, undefined);
  const [pw, setPw] = useState("");

  return (
    <div className="card card-pad" style={{ marginTop: 16, maxWidth: 540 }}>
      <h2 className="admin-h1" style={{ fontSize: 16 }}>{t.resetPassword}</h2>
      <p className="muted-sm" style={{ marginBottom: 10 }}>{t.resetPasswordHint}</p>

      <form action={action} className="reset-pw">
        <input type="hidden" name="userId" value={userId} />
        <div className="reset-pw-row">
          <input
            className="input"
            name="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={t.newPassword}
            autoComplete="off"
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPw(generatePassword())}>
            {t.generate}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || pw.length < 8}
            onClick={(e) => {
              if (!window.confirm(t.confirmResetPassword)) e.preventDefault();
            }}
          >
            {t.setPassword}
          </button>
        </div>
      </form>

      {state?.errors?.password && <p className="field-error">{state.errors.password.join(" ")}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}
      {state?.ok && (
        <p className="auth-ok" role="status">✓ {t.passwordUpdated}</p>
      )}
    </div>
  );
}
