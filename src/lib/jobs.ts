import type { Locale } from "@/i18n/config";
import type { LabelDef } from "@/lib/market";

export const JOB_TYPES: LabelDef[] = [
  { key: "FULL_TIME", icon: "🕘", en: "Full-time", ka: "სრული განაკვეთი" },
  { key: "PART_TIME", icon: "🕓", en: "Part-time", ka: "ნახევარი განაკვეთი" },
  { key: "CONTRACT", icon: "📝", en: "Contract", ka: "კონტრაქტი" },
  { key: "TEMPORARY", icon: "📆", en: "Temporary", ka: "დროებითი" },
  { key: "GIG", icon: "⚡", en: "One-off / gig", ka: "ერთჯერადი" },
];

export function jobTypeLabel(key: string | null | undefined, locale: Locale): string {
  const d = key ? JOB_TYPES.find((j) => j.key === key) : undefined;
  return d ? `${d.icon} ${locale === "ka" ? d.ka : d.en}` : "";
}
