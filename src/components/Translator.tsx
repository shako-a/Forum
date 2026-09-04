"use client";

import { useState, useTransition } from "react";
import { translateText } from "@/app/actions/ai";
import { track } from "@/lib/track";
import { TRANSLATE_LANGS, TRANSLATE_MAX_CHARS } from "@/lib/translate";
import type { Dictionary } from "@/i18n/dictionaries";

export function Translator({ dict, defaultTarget }: { dict: Dictionary; defaultTarget: string }) {
  const t = dict.translate;
  const [source, setSource] = useState("");
  const [target, setTarget] = useState(defaultTarget);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const tooLong = source.length > TRANSLATE_MAX_CHARS;
  const canSend = source.trim().length >= 2 && !tooLong && !pending;

  function submit() {
    if (!canSend) return;
    setError(null);
    start(async () => {
      const res = await translateText(source, target);
      if (res.ok) {
        track("ai_translate_used");
        setResult(res.text);
      } else {
        setResult("");
        setError(
          res.error === "unconfigured"
            ? dict.ask.errorUnconfigured
            : res.error === "credits"
              ? dict.ask.errorCredits
              : dict.ask.errorGeneric,
        );
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the text is selectable anyway
    }
  }

  return (
    <div className="tr-wrap">
      <div className="tr-bar">
        <label htmlFor="tr-target">{t.into}</label>
        <select
          id="tr-target"
          className="input tr-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {TRANSLATE_LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <span className="muted-sm tr-detect">{t.autoDetect}</span>
      </div>

      <div className="tr-panes">
        <div className="tr-pane">
          <textarea
            className="input tr-input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => {
              // Enter inserts a newline here — passages are multi-line, so the
              // shortcut is the modifier, the opposite of the chat composer.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t.placeholder}
            rows={10}
          />
          <div className="tr-count">
            <span className={tooLong ? "field-error" : "muted-sm"}>
              {source.length} / {TRANSLATE_MAX_CHARS}
            </span>
          </div>
        </div>

        <div className="tr-pane">
          <div className="tr-output" aria-live="polite" aria-busy={pending}>
            {pending ? (
              <span className="tr-thinking">{dict.ask.thinking}</span>
            ) : result ? (
              result
            ) : (
              <span className="tr-empty">{t.outputEmpty}</span>
            )}
          </div>
          {result && !pending && (
            <div className="tr-count">
              <button type="button" className="action" onClick={copy}>
                {copied ? `✓ ${t.copied}` : `⧉ ${t.copy}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="tr-actions">
        <button type="button" className="btn btn-primary" disabled={!canSend} onClick={submit}>
          <span className="spark">✦</span> {pending ? dict.ask.thinking : t.translate}
        </button>
        <span className="muted-sm">{t.hint}</span>
      </div>
      <p className="ask-disclaimer">{t.disclaimer}</p>
    </div>
  );
}
