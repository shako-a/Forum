// Helpers for working with the ProseMirror/Tiptap JSON we store in Post.body.
// We render to HTML ourselves from a strict whitelist (no untrusted HTML is ever
// emitted), which keeps post rendering safe from XSS.

type PMMark = { type?: string; attrs?: Record<string, unknown> };
type PMNode = {
  type?: string;
  text?: string;
  content?: PMNode[];
  marks?: PMMark[];
  attrs?: Record<string, unknown>;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Only allow safe URL schemes (blocks javascript:, data:, etc.).
export function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return null;
}

// Image src: same as safeUrl, plus inline base64 `data:image/...` (used for
// uploaded images embedded directly in the document — no object storage yet).
const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export function safeImageUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  if (DATA_IMAGE_RE.test(trimmed)) return trimmed;
  return null;
}

// Append an image node to a document (creating one if needed). Used to attach
// an uploaded image to a post body.
export function appendImage(doc: unknown, imageUrl: string): PMNode {
  const base: PMNode =
    doc && typeof doc === "object" && (doc as PMNode).type === "doc"
      ? (doc as PMNode)
      : { type: "doc", content: [] };
  const content = Array.isArray(base.content) ? [...base.content] : [];
  content.push({ type: "image", attrs: { src: imageUrl } });
  return { ...base, content };
}

function applyMarks(text: string, marks?: PMMark[]): string {
  let html = escapeHtml(text);
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "code":
        html = `<code>${html}</code>`;
        break;
      case "link": {
        const href = safeUrl(mark.attrs?.href);
        if (href) html = `<a href="${escapeHtml(href)}" rel="nofollow noopener" target="_blank">${html}</a>`;
        break;
      }
    }
  }
  return html;
}

// The only line-height values the editor's line-spacing control can set. The
// output is dangerouslySetInnerHTML'd, so this allow-list is what keeps a bad
// attribute value out of the style string. 1.5 is the CSS default (no inline
// style needed), so only the non-default choices are here. Keep in sync with
// the RichTextEditor line-spacing options and the LineHeight extension.
const ALLOWED_LINE_HEIGHTS = new Set(["1.2", "1.9"]);

function lineHeightStyle(value: unknown): string {
  return typeof value === "string" && ALLOWED_LINE_HEIGHTS.has(value)
    ? ` style="line-height:${value}"`
    : "";
}

function renderNode(node: PMNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(renderNode).join("");
    case "paragraph":
      return `<p${lineHeightStyle(node.attrs?.lineHeight)}>${(node.content ?? []).map(renderNode).join("")}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 3);
      const inner = (node.content ?? []).map(renderNode).join("");
      return `<h${level}${lineHeightStyle(node.attrs?.lineHeight)}>${inner}</h${level}>`;
    }
    case "text":
      return applyMarks(node.text ?? "", node.marks);
    case "bulletList":
      return `<ul>${(node.content ?? []).map(renderNode).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map(renderNode).join("")}</ol>`;
    case "listItem":
      return `<li>${(node.content ?? []).map(renderNode).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(renderNode).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${(node.content ?? []).map(renderNode).join("")}</code></pre>`;
    case "horizontalRule":
      return "<hr/>";
    case "hardBreak":
      return "<br/>";
    case "image": {
      const src = safeImageUrl(node.attrs?.src);
      if (!src) return "";
      const alt = escapeHtml(String(node.attrs?.alt ?? ""));
      return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy"/>`;
    }
    default:
      // Unknown node: render any children, ignore the wrapper.
      return (node.content ?? []).map(renderNode).join("");
  }
}

export function pmToHtml(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  return renderNode(doc as PMNode);
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "codeBlock",
  "horizontalRule",
]);

export function pmPlainText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: PMNode) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
    if (n.type && BLOCK_TYPES.has(n.type)) parts.push(" ");
  };
  walk(doc as PMNode);
  return parts.join("").replace(/\s+/g, " ").trim();
}

function hasImage(doc: PMNode): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (doc.type === "image") return true;
  return (doc.content ?? []).some(hasImage);
}

export function pmHasContent(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  return pmPlainText(doc).length > 0 || hasImage(doc as PMNode);
}

// First image src in a document (used to prefill the reply edit form).
export function pmFirstImage(doc: unknown): string | null {
  let found: string | null = null;
  const walk = (n: PMNode) => {
    if (found || !n || typeof n !== "object") return;
    if (n.type === "image" && typeof n.attrs?.src === "string") {
      found = n.attrs.src as string;
      return;
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc as PMNode);
  return found;
}

// Build a ProseMirror document from plain text (used for text replies). Blank
// lines split paragraphs; single newlines become hard breaks.
export function textToPmDoc(text: string): PMNode {
  const inline = (para: string): PMNode[] => {
    const out: PMNode[] = [];
    para.split("\n").forEach((line, i) => {
      if (i > 0) out.push({ type: "hardBreak" });
      if (line) out.push({ type: "text", text: line });
    });
    return out;
  };

  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: (paragraphs.length ? paragraphs : [""]).map((p) => ({
      type: "paragraph",
      content: inline(p),
    })),
  };
}

// Reply document: plain text plus an optional (sanitized) image at the end.
export function buildReplyDoc(text: string, imageUrl?: string | null): PMNode {
  const doc = textToPmDoc(text);
  const url = imageUrl ? safeImageUrl(imageUrl) : null;
  if (url) (doc.content as PMNode[]).push({ type: "image", attrs: { src: url } });
  return doc;
}
