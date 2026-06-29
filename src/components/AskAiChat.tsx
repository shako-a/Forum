"use client";

import { useState, useRef, useTransition } from "react";
import { askAi } from "@/app/actions/ai";
import type { Dictionary } from "@/i18n/dictionaries";

type Turn = { q: string; a: string };

export function AskAiChat({ dict }: { dict: Dictionary }) {
  const t = dict.ask;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const q = input.trim();
    if (q.length < 3 || pending) return;
    setError(null);
    setInput("");
    start(async () => {
      const res = await askAi(q);
      if (res.ok) {
        setTurns((prev) => [...prev, { q, a: res.text }]);
      } else {
        setError(res.error === "unconfigured" ? t.errorUnconfigured : t.errorGeneric);
        setInput(q); // restore so they can retry
      }
      inputRef.current?.focus();
    });
  }

  return (
    <div className="ask-chat">
      {turns.length === 0 && !pending && <p className="ask-intro">{t.intro}</p>}

      {turns.map((turn, i) => (
        <div key={i} className="ask-turn">
          <div className="ask-q">{turn.q}</div>
          <div className="ask-a">{turn.a}</div>
        </div>
      ))}

      {pending && <div className="ask-a ask-thinking">{t.thinking}</div>}
      {error && <p className="field-error" role="alert">{error}</p>}

      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          className="ask-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t.placeholder}
          rows={2}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || input.trim().length < 3}>
          <span className="spark">✦</span> {pending ? t.thinking : t.send}
        </button>
      </form>
      <p className="ask-disclaimer">{t.disclaimer}</p>
    </div>
  );
}
