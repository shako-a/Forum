// Translator vocabulary. Client-safe (no server-only import) so the picker and
// the server action agree on one list.

export type TranslateLang = {
  code: string;
  /** Endonym — a Georgian speaker looks for "ქართული", not "Georgian". */
  label: string;
  /** Name the model is instructed in, so the prompt stays unambiguous. */
  english: string;
};

// Ordered by who actually uses this forum: Georgians in the US first, then the
// languages the diaspora most often needs to read or write.
export const TRANSLATE_LANGS: TranslateLang[] = [
  { code: "ka", label: "ქართული", english: "Georgian" },
  { code: "en", label: "English", english: "English" },
  { code: "ru", label: "Русский", english: "Russian" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "fr", label: "Français", english: "French" },
  { code: "es", label: "Español", english: "Spanish" },
  { code: "it", label: "Italiano", english: "Italian" },
  { code: "tr", label: "Türkçe", english: "Turkish" },
  { code: "el", label: "Ελληνικά", english: "Greek" },
  { code: "pl", label: "Polski", english: "Polish" },
];

export function isTranslateLang(code: string): boolean {
  return TRANSLATE_LANGS.some((l) => l.code === code);
}

export function translateLang(code: string): TranslateLang | null {
  return TRANSLATE_LANGS.find((l) => l.code === code) ?? null;
}

// Long enough to be useful for a post or a letter, short enough that one call
// can't drain an allowance. Enforced on both sides.
export const TRANSLATE_MAX_CHARS = 5000;

/** Default target: whatever the reader is not currently reading the site in. */
export function defaultTarget(locale: string): string {
  return locale === "ka" ? "en" : "ka";
}
