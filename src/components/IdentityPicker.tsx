"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

export type AliasOption = { index: number; name: string; color: string };

// The composer identity chooser. Renders the avatar + current identity; clicking
// it opens a menu to post as the real account or one of 3 anonymous aliases.
// Submits the choice via a hidden `anonAlias` input ("" = real, 1..3 = alias).
export function IdentityPicker({
  realName,
  aliases,
  dict,
  actingAs,
}: {
  realName: string;
  aliases: AliasOption[];
  dict: Dictionary;
  /** Business name when the user is acting as a business — the identity is then
   *  fixed to that business (the server attributes the post to it regardless). */
  actingAs?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<number | null>(null); // null = real identity

  // Acting as a business: identity is locked, no chooser (and no anonAlias).
  if (actingAs) {
    return (
      <div className="identity-picker identity-acting">
        <span className="avatar" style={{ background: "var(--blue)" }} aria-hidden="true">
          🏢
        </span>
        <span className="identity-name">{actingAs}</span>
      </div>
    );
  }

  const selected = aliases.find((a) => a.index === sel);
  const current = selected
    ? { name: selected.name, color: selected.color, anon: true }
    : { name: realName, color: "var(--blue)", anon: false };
  const initial = (s: string) => s.charAt(0).toUpperCase();

  return (
    <div className="identity-picker">
      <input type="hidden" name="anonAlias" value={sel ?? ""} />
      <button
        type="button"
        className="identity-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={dict.post.postingAs}
      >
        <span className="avatar" style={{ background: current.color }}>
          {current.anon ? "🕶" : initial(current.name)}
        </span>
        <span className="identity-name">
          {current.name}
          {current.anon && <span className="identity-anon-tag"> · {dict.post.anonymous}</span>}
        </span>
        <span className="identity-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="identity-menu" role="menu">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={sel === null}
            className={`identity-opt${sel === null ? " active" : ""}`}
            onClick={() => {
              setSel(null);
              setOpen(false);
            }}
          >
            <span className="avatar" style={{ background: "var(--blue)" }}>
              {initial(realName)}
            </span>
            <span>
              {realName}
              <span className="muted-sm"> · {dict.post.realIdentity}</span>
            </span>
          </button>

          {aliases.map((a) => (
            <button
              key={a.index}
              type="button"
              role="menuitemradio"
              aria-checked={sel === a.index}
              className={`identity-opt${sel === a.index ? " active" : ""}`}
              onClick={() => {
                setSel(a.index);
                setOpen(false);
              }}
            >
              <span className="avatar" style={{ background: a.color }}>
                🕶
              </span>
              <span>
                {a.name}
                <span className="muted-sm"> · {dict.post.anonymous}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
