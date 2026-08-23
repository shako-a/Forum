"use client";

import { useEffect, useRef, useState } from "react";

// A small, dependency-free emoji picker: a button that opens a popover grid of
// common emojis. onPick receives the chosen emoji. onMouseDown is prevented on
// every control so the host editor keeps its selection/cursor for insertion.
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "😊",
  "😉", "😍", "😘", "😎", "🤩", "🥳", "😇", "🤔", "🤗", "🤭",
  "😌", "😔", "😢", "😭", "😤", "😠", "🥺", "😳", "🤯", "😴",
  "👍", "👎", "👏", "🙌", "👋", "🤝", "💪", "🙏", "✌️", "🤞",
  "👌", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "💔", "✨", "🔥", "⭐", "🎉", "🎊", "🎁", "💯", "✅", "❌",
  "⚠️", "📌", "📍", "💡", "📷", "🎯", "🚀", "💰", "🏆", "🍀",
  "☕", "🍺", "🍷", "🎵", "🌍", "🇬🇪", "🏔️", "😅", "🤷", "🙈",
];

export function EmojiPicker({ onPick, title }: { onPick: (emoji: string) => void; title: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="emoji-wrap" ref={wrapRef}>
      <button
        type="button"
        className="rte-btn"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        😊
      </button>
      {open && (
        <div className="emoji-menu" role="menu">
          {EMOJIS.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              className="emoji-item"
              aria-label={emoji}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
