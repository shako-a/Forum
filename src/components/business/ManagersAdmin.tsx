"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBusinessManager, removeBusinessManager } from "@/app/actions/business";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Manager = { userId: string; forumName: string };

// Owner-only management of the delegated managers for a business.
export function ManagersAdmin({
  locale,
  businessId,
  ownerName,
  managers,
  dict,
}: {
  locale: Locale;
  businessId: string;
  ownerName: string;
  managers: Manager[];
  dict: Dictionary;
}) {
  const t = dict.business;
  const router = useRouter();
  const [state, action, pending] = useActionState(addBusinessManager, undefined);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div>
      <ul className="biz-managers">
        <li className="biz-manager">
          <span>
            <strong>{ownerName}</strong> <span className="muted-sm">· {t.ownerLabel}</span>
          </span>
        </li>
        {managers.map((m) => (
          <li key={m.userId} className="biz-manager">
            <span>
              {m.forumName} <span className="muted-sm">· {t.managerLabel}</span>
            </span>
            <button
              type="button"
              className="action mod-action"
              disabled={removing}
              onClick={() =>
                startRemove(async () => {
                  await removeBusinessManager(businessId, m.userId, locale);
                  router.refresh();
                })
              }
            >
              {t.removeManager}
            </button>
          </li>
        ))}
        {managers.length === 0 && <li className="muted-sm biz-manager">{t.noManagers}</li>}
      </ul>

      <form ref={formRef} action={action} className="biz-addmanager">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="locale" value={locale} />
        <input name="forumName" className="input" placeholder={t.managerForumName} autoComplete="off" />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.addManager}
        </button>
      </form>
      {state?.errors?.forumName && <p className="field-error">{state.errors.forumName[0]}</p>}
      {state?.message && !state.ok && <p className="field-error">{state.message}</p>}
    </div>
  );
}
