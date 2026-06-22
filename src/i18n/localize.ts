import type { Locale } from "./config";
import type { Category, AdCard, Label } from "@/generated/prisma/client";

// Pick the locale-appropriate column from a row that stores `<field>En` / `<field>Ka`.
export function categoryName(category: Pick<Category, "nameEn" | "nameKa">, locale: Locale) {
  return locale === "ka" ? category.nameKa : category.nameEn;
}

export function adTitle(ad: Pick<AdCard, "titleEn" | "titleKa">, locale: Locale) {
  return locale === "ka" ? ad.titleKa : ad.titleEn;
}

export function labelName(label: Pick<Label, "nameEn" | "nameKa">, locale: Locale) {
  return locale === "ka" ? label.nameKa : label.nameEn;
}
