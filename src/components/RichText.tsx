import { pmToHtml } from "@/lib/prosemirror";

// Renders a listing description: the rich document when the listing has one,
// otherwise the plain text it was written with before the editor existed.
//
// The HTML comes from pmToHtml, which builds it from a strict whitelist rather
// than passing anything the user wrote through — the same path post bodies take.
// Plain text keeps its original class, which is what carries `white-space:
// pre-wrap` so the newlines in older listings still show.
export function RichText({
  doc,
  text,
  plainClassName,
}: {
  doc: unknown;
  text?: string | null;
  plainClassName: string;
}) {
  if (doc) {
    const html = pmToHtml(doc);
    if (html) return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (!text) return null;
  return <p className={plainClassName}>{text}</p>;
}
