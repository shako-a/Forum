"use client";

import { useActionState, useState, useTransition } from "react";
import { blockUser, unblockUser, reportUser } from "@/app/actions/inbox";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function DmActions({
  locale,
  dict,
  otherUserId,
  conversationId,
  iBlocked,
}: {
  locale: Locale;
  dict: Dictionary;
  otherUserId: string;
  conversationId: string;
  iBlocked: boolean;
}) {
  const t = dict.inbox;
  const [pending, startTransition] = useTransition();
  const [reporting, setReporting] = useState(false);
  const [state, action] = useActionState(reportUser, undefined);

  function toggleBlock() {
    if (!iBlocked && !window.confirm(t.confirmBlock)) return;
    const fn = iBlocked ? unblockUser : blockUser;
    startTransition(() => void fn(otherUserId, locale));
  }

  return (
    <div className="dm-actions">
      <div className="dm-actions-row">
        <button type="button" className="dm-action-btn" onClick={() => setReporting((v) => !v)}>
          ⚑ {t.report}
        </button>
        <button type="button" className="dm-action-btn" disabled={pending} onClick={toggleBlock}>
          {iBlocked ? "✓ " + t.unblock : t.block}
        </button>
      </div>
      {reporting &&
        (state?.ok ? (
          <p className="dm-report-ok">✓ {t.reported}</p>
        ) : (
          <form action={action} className="dm-report-form">
            <input type="hidden" name="reportedUserId" value={otherUserId} />
            <input type="hidden" name="conversationId" value={conversationId} />
            <textarea name="reason" className="input" rows={2} placeholder={t.reportReason} />
            <button type="submit" className="btn btn-primary btn-sm">
              {t.submitReport}
            </button>
          </form>
        ))}
    </div>
  );
}
