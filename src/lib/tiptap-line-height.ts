import { Extension } from "@tiptap/core";

// Adds a `lineHeight` attribute to paragraphs and headings. Stored on the node
// (so it round-trips through the ProseMirror JSON) and rendered as an inline
// style so the chosen spacing shows live in the editor. The server renderer
// (pmToHtml) re-emits the same style, from a fixed allow-list, into the
// published post — keep the two in sync.
const TYPES = ["paragraph", "heading"];

export const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },
});
