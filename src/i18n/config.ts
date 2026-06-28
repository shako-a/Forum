// Central i18n configuration. Adding a new language = add it here + a dictionary file.
export const locales = ["en", "ka"] as const;
export type Locale = (typeof locales)[number];

// Georgian is the default — this is a Georgian community. New visitors land in
// ka unless they pick a language (remembered via the NEXT_LOCALE cookie).
export const defaultLocale: Locale = "ka";

// Human-readable names shown in the language switcher.
export const localeNames: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
