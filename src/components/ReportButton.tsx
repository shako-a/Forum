"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/app/actions/inbox";
import type { Dictionary } from "@/i18n/dictionaries";

// "გასაჩივრება" — report a post or reply. Prompts for an optional reason, then
// files a report for the admin Reports panel. Shows a done state on success.
export function ReportButton({
  postId,
  replyId,
  dict,
  className = "action",
}: {
  postId?: string;
  replyId?: string;
  dict: Dictionary;
  className?: string;
}) {
  const t = dict.post;
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function run() {
    if (pending || done) return;
    const reason = window.prompt(t.reportReason);
    if (reason === null) return; // cancelled
    const fd = new FormData();
    if (postId) fd.set("postId", postId);
    if (replyId) fd.set("replyId", replyId);
    fd.set("reason", reason);
    start(async () => {
      const res = await reportContent(undefined, fd);
      if (res?.ok) setDone(true);
    });
  }

  return (
    <button type="button" className={className} onClick={run} disabled={pending || done} title={t.report}>
      ⚑ {done ? t.reported : pending ? "…" : t.report}
    </button>
  );
}
