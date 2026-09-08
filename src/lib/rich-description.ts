import "server-only";
import { pmHasContent, pmPlainText, pmValidate } from "@/lib/prosemirror";
import { Prisma } from "@/generated/prisma/client";

// Listing descriptions are edited with the same rich editor as posts, but a
// listing's description also has to stay searchable and sliceable: every
// directory query matches it with `contains`, and every card shows a truncated
// snippet of it. So both forms are stored — the document in `descriptionRich`,
// its plain-text projection in `description` — and the plain column keeps doing
// exactly what it did before the editor existed.
//
// The editor posts its document as a JSON string under `<field>Rich`. Callers
// validate the returned `plain` against the schema they already had, so the
// existing length rules keep applying to real prose rather than to JSON.

export type RichDescription = {
  /**
   * Document to store, ready to assign to a nullable Json column. An empty
   * field yields Prisma.DbNull (SQL NULL) rather than JSON null, so clearing a
   * description puts the row back to "render the plain text".
   */
  rich: Prisma.InputJsonValue | typeof Prisma.DbNull;
  /** Plain-text projection: what search matches and cards slice. */
  plain: string;
  /** True when the document blew a structural limit and was refused. */
  tooLarge: boolean;
};

const EMPTY: RichDescription = { rich: Prisma.DbNull, plain: "", tooLarge: false };

export function readRichDescription(formData: FormData, field = "descriptionRich"): RichDescription {
  const raw = formData.get(field);
  if (typeof raw !== "string" || raw.trim() === "") return EMPTY;

  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return EMPTY;
  }

  // Same guard the post body gets: the renderer is recursive, so a deeply
  // nested document would blow the stack on every view of the listing.
  const check = pmValidate(doc, raw.length);
  if (!check.ok) return { ...EMPTY, tooLarge: true };

  // An untouched editor still submits a doc with one empty paragraph. That is
  // an empty description, not a document worth storing.
  if (!pmHasContent(doc)) return EMPTY;

  return { rich: doc as Prisma.InputJsonValue, plain: pmPlainText(doc), tooLarge: false };
}

/** Message shown when a document is refused — matches the post composer's. */
export const RICH_TOO_LARGE = "The description is too large or too deeply nested.";
