"use client";

import { useState, useTransition } from "react";
import { summarizePost } from "@/app/actions/ai";
import type { Dictionary } from "@/i18n/dictionaries";

export function SummarizeButton({ postId, dict }: { postId: string; dict: Dictionary }) {
  const t = dict.ask;
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const res = await summarizePost(postId);
      if (res.ok) setSummary(res.text);
      else setError(res.error === "unconfigured" ? t.errorUnconfigured : t.summaryError);
    });
  }

  return (
    <div className="ai-summary-block">
      {summary === null ? (
        <button type="button" className="ai-summary-btn" onClick={run} disabled={pending}>
          <span className="spark">✦</span> {pending ? t.summarizing : t.summarize}
        </button>
      ) : (
        <div className="ai-summary-card">
          <div className="ai-summary-head">{t.summaryTitle}</div>
          <p className="ai-summary-text">{summary}</p>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
