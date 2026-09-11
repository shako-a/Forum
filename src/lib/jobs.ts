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

// The line of work — orthogonal to JOB_TYPES (the employment arrangement).
// Keys are stored on JobPosting.category; the board filters by them.
export const JOB_CATEGORIES: LabelDef[] = [
  { key: "driver", icon: "🚗", en: "Driver", ka: "მძღოლი" },
  { key: "restaurant", icon: "🍽️", en: "Restaurant / kitchen", ka: "რესტორანი / სამზარეულო" },
  { key: "construction", icon: "🔨", en: "Construction / renovation", ka: "მშენებლობა / რემონტი" },
  { key: "office", icon: "🏢", en: "Office", ka: "საოფისე" },
  { key: "caregiver", icon: "🩺", en: "Caregiver", ka: "მომვლელი" },
  { key: "nanny", icon: "👶", en: "Nanny", ka: "ძიძა" },
  { key: "cleaner", icon: "🧹", en: "Cleaner", ka: "დამლაგებელი" },
  { key: "retail", icon: "🛒", en: "Retail / sales", ka: "ვაჭრობა / გაყიდვები" },
  { key: "beauty", icon: "💇", en: "Beauty", ka: "სილამაზე" },
  { key: "warehouse", icon: "📦", en: "Warehouse / logistics", ka: "საწყობი / ლოგისტიკა" },
  { key: "medical", icon: "🏥", en: "Medical", ka: "მედიცინა" },
  { key: "tech", icon: "💻", en: "IT / tech", ka: "IT / ტექნოლოგიები" },
  { key: "education", icon: "🎓", en: "Education", ka: "განათლება" },
  { key: "other", icon: "📌", en: "Other", ka: "სხვა" },
];
export const JOB_CATEGORY_KEYS = JOB_CATEGORIES.map((c) => c.key) as [string, ...string[]];

export function jobCategoryLabel(key: string | null | undefined, locale: Locale): string {
  const d = key ? JOB_CATEGORIES.find((c) => c.key === key) : undefined;
  return d ? `${d.icon} ${locale === "ka" ? d.ka : d.en}` : "";
}

export function jobCategoryIcon(key: string | null | undefined): string {
  return JOB_CATEGORIES.find((c) => c.key === key)?.icon ?? "💼";
}
