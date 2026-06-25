"use client";

import { useTransition } from "react";
import { setRevealAnonymousToStaff } from "@/app/actions/admin-settings";
import type { Dictionary } from "@/i18n/dictionaries";

// Owner-only switch: lets other admins/moderators see real authors behind
// anonymous content. (The owner always can, regardless of this setting.)
export function AnonRevealToggle({ enabled, dict }: { enabled: boolean; dict: Dictionary }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="admin-check">
      <input
        type="checkbox"
        defaultChecked={enabled}
        disabled={pending}
        onChange={(e) => startTransition(() => void setRevealAnonymousToStaff(e.target.checked))}
      />
      <span>{dict.admin.revealAnon}</span>
    </label>
  );
}
