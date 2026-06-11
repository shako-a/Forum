import type { Locale } from "@/i18n/config";
import { pmPlainText } from "@/lib/prosemirror";

// Locale-aware "3h ago" / "2d ago" relative time.
export function timeAgo(date: Date, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return rtf.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return rtf.format(0, "second");
}

// Plain-text excerpt from a post's JSON body. Handles both the rich-text
// ProseMirror documents from the editor and the legacy `{ text }` demo posts.
export function postExcerpt(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    // ProseMirror document
    if ((body as { type?: string }).type === "doc") return pmPlainText(body);
    // Legacy demo shape
    if ("text" in body) {
      const text = (body as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }
  return "";
}
