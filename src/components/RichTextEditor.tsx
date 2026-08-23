"use client";

import { useState, useCallback } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { LineHeight } from "@/lib/tiptap-line-height";

const EMPTY_DOC = '{"type":"doc","content":[{"type":"paragraph"}]}';

export type SpacingLabels = { label: string; normal: string; tight: string; relaxed: string };
const DEFAULT_SPACING: SpacingLabels = {
  label: "Line spacing",
  normal: "Normal",
  tight: "Tight",
  relaxed: "Relaxed",
};

// Toolbar button.
function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={active ? "rte-btn active" : "rte-btn"}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, spacing }: { editor: Editor; spacing: SpacingLabels }) {
  // Reactive active-states (Tiptap v3 requires useEditorState for this).
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      lineHeight:
        (e.getAttributes("paragraph").lineHeight as string | null) ||
        (e.getAttributes("heading").lineHeight as string | null) ||
        "",
    }),
  });

  // Apply line spacing to the paragraph/heading at the cursor (empty = default).
  const setSpacing = (value: string) => {
    const lh = value || null;
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { lineHeight: lh })
      .updateAttributes("heading", { lineHeight: lh })
      .run();
  };

  const addLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL", "https://");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  return (
    <div className="rte-toolbar">
      <Btn title="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn title="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </Btn>
      <Btn title="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </Btn>
      <span className="rte-sep" />
      <Btn title="Heading" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Btn title="Subheading" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </Btn>
      <span className="rte-sep" />
      <Btn title="Bullet list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </Btn>
      <Btn title="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </Btn>
      <Btn title="Quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        ❝
      </Btn>
      <span className="rte-sep" />
      <select
        className="rte-select"
        title={spacing.label}
        aria-label={spacing.label}
        value={s.lineHeight || ""}
        onChange={(e) => setSpacing(e.target.value)}
      >
        <option value="">{spacing.normal}</option>
        <option value="1.2">{spacing.tight}</option>
        <option value="1.9">{spacing.relaxed}</option>
      </select>
      <span className="rte-sep" />
      <Btn title="Link" active={s.link} onClick={addLink}>
        🔗
      </Btn>
      <Btn title="Image" onClick={addImage}>
        🖼
      </Btn>
      <span className="rte-sep" />
      <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        ↺
      </Btn>
      <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        ↻
      </Btn>
    </div>
  );
}

// Rich text editor that serializes its document into a hidden input so it submits
// with the surrounding <form>. Body is stored as ProseMirror JSON.
export function RichTextEditor({
  name,
  placeholder,
  initialDoc,
  spacing = DEFAULT_SPACING,
}: {
  name: string;
  placeholder?: string;
  initialDoc?: string; // ProseMirror JSON string, for editing
  spacing?: SpacingLabels;
}) {
  const [doc, setDoc] = useState(initialDoc || EMPTY_DOC);

  let initialContent: object | string = "";
  if (initialDoc) {
    try {
      initialContent = JSON.parse(initialDoc);
    } catch {
      initialContent = "";
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      LineHeight,
    ],
    content: initialContent,
    immediatelyRender: false, // avoid SSR hydration mismatch
    editorProps: {
      attributes: { "aria-label": placeholder ?? "Body", role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor }) => setDoc(JSON.stringify(editor.getJSON())),
  });

  return (
    <div className="rte">
      {editor && <Toolbar editor={editor} spacing={spacing} />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={doc} />
    </div>
  );
}
