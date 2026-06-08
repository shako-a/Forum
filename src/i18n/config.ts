// Central i18n configuration. Adding a new language = add it here + a dictionary file.
export const locales = ["en", "ka"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Human-readable names shown in the language switcher.
export const localeNames: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
