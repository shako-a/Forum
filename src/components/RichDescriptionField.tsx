"use client";

import { RichTextEditor } from "@/components/RichTextEditor";
import { textToPmDoc } from "@/lib/prosemirror";
import type { Dictionary } from "@/i18n/dictionaries";

// The listing description editor: the same toolbar posts get, wired for a
// listing's two columns.
//
// `doc` is the stored rich document; `text` the plain description a listing was
// written with before the editor existed. Seeding the editor from that plain
// text is what makes an old listing editable instead of appearing blank — the
// author keeps what they wrote and can format it from there.
export function RichDescriptionField({
  name = "descriptionRich",
  doc,
  text,
  placeholder,
  dict,
}: {
  name?: string;
  doc?: unknown;
  text?: string | null;
  placeholder?: string;
  dict: Dictionary;
}) {
  const initial = doc ?? (text ? textToPmDoc(text) : null);

  return (
    <RichTextEditor
      name={name}
      placeholder={placeholder}
      initialDoc={initial ? JSON.stringify(initial) : undefined}
      spacing={{
        label: dict.post.lineSpacing,
        normal: dict.post.spacingNormal,
        tight: dict.post.spacingTight,
        relaxed: dict.post.spacingRelaxed,
      }}
    />
  );
}
