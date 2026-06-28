"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sendMessage, searchPosts } from "@/app/actions/inbox";
import { categoryStyle } from "@/lib/category-style";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type PostHit = { id: string; slug: string; title: string; categorySlug: string };

export function MessageComposer({
  locale,
  dict,
  conversationId,
  initialAttached = null,
}: {
  locale: Locale;
  dict: Dictionary;
  conversationId: string;
  initialAttached?: PostHit | null;
}) {
  const t = dict.inbox;
  const [state, action, pending] = useActionState(sendMessage, undefined);
  const ref = useRef<HTMLFormElement>(null);

  // Attach-a-post state
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PostHit[]>([]);
  const [attached, setAttached] = useState<PostHit | null>(initialAttached);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setAttached(null);
      setPicking(false);
      setQuery("");
      setHits([]);
    }
  }, [state]);

  useEffect(() => {
    if (!picking) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      startSearch(async () => setHits(await searchPosts(q)));
    }, 250);
    return () => clearTimeout(id);
  }, [query, picking]);

  return (
    <form action={action} ref={ref} className="dm-composer-wrap">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="conversationId" value={conversationId} />
      {attached && <input type="hidden" name="postId" value={attached.id} />}

      {/* Attached post chip */}
      {attached && (
        <div className="dm-attach-chip">
          <span className="dot" style={{ background: categoryStyle(attached.categorySlug).color }} />
          <span className="dm-attach-title">{attached.title}</span>
          <button type="button" className="dm-attach-x" aria-label={t.removeAttachment} onClick={() => setAttached(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Post search popover */}
      {picking && !attached && (
        <div className="dm-attach-search">
          <input
            className="input"
            placeholder={t.searchPostPlaceholder}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim().length >= 2 && (
            <ul className="dm-attach-results">
              {searching && <li className="dm-attach-empty">…</li>}
              {!searching && hits.length === 0 && <li className="dm-attach-empty">{t.noPostsFound}</li>}
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="dm-attach-result"
                    onClick={() => {
                      setAttached(h);
                      setPicking(false);
                    }}
                  >
                    <span className="dot" style={{ background: categoryStyle(h.categorySlug).color }} />
                    {h.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="dm-composer">
        <button
          type="button"
          className="dm-attach-btn"
          title={t.attachPost}
          aria-label={t.attachPost}
          onClick={() => setPicking((v) => !v)}
        >
          📎
        </button>
        <input
          name="body"
          className="input"
          placeholder={t.messagePlaceholder}
          autoComplete="off"
          aria-invalid={state?.errors?.body ? true : undefined}
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.send}
        </button>
      </div>
    </form>
  );
}
