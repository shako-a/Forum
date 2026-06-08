import "server-only";
import type { Locale } from "./config";

// Type the dictionary shape off the English file so all locales stay in sync
// and every page gets autocomplete + compile-time key checking.
import type en from "./dictionaries/en.json";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ka: () => import("./dictionaries/ka.json").then((m) => m.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
