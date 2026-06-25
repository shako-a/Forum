// Curated business categories for the directory (admin CRUD not needed yet).
// Stored on Business.category as the `key`; labels are localized EN/KA.

import type { Locale } from "@/i18n/config";

export type BusinessCategory = { key: string; en: string; ka: string; icon: string };

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { key: "restaurant", en: "Food & Restaurants", ka: "კვება და რესტორნები", icon: "🍽" },
  { key: "legal", en: "Legal", ka: "იურიდიული", icon: "⚖️" },
  { key: "accounting", en: "Accounting & Tax", ka: "ბუღალტერია და გადასახადები", icon: "📊" },
  { key: "realestate", en: "Real Estate", ka: "უძრავი ქონება", icon: "🏠" },
  { key: "health", en: "Health & Medical", ka: "ჯანმრთელობა", icon: "🩺" },
  { key: "beauty", en: "Beauty & Wellness", ka: "სილამაზე და კეთილდღეობა", icon: "💇" },
  { key: "auto", en: "Auto & Transport", ka: "ავტო და ტრანსპორტი", icon: "🚗" },
  { key: "education", en: "Education & Tutoring", ka: "განათლება და რეპეტიტორობა", icon: "📚" },
  { key: "retail", en: "Retail & Shops", ka: "მაღაზიები", icon: "🛍" },
  { key: "construction", en: "Construction & Trades", ka: "მშენებლობა და ხელოსნობა", icon: "🔨" },
  { key: "it", en: "IT & Software", ka: "IT და პროგრამირება", icon: "💻" },
  { key: "finance", en: "Finance & Insurance", ka: "ფინანსები და დაზღვევა", icon: "💳" },
  { key: "events", en: "Events & Catering", ka: "ღონისძიებები და კეთერინგი", icon: "🎉" },
  { key: "other", en: "Other", ka: "სხვა", icon: "🏢" },
];

const BY_KEY = new Map(BUSINESS_CATEGORIES.map((c) => [c.key, c]));

export const BUSINESS_CATEGORY_KEYS = BUSINESS_CATEGORIES.map((c) => c.key);

export function isBusinessCategory(key: string | null | undefined): boolean {
  return !!key && BY_KEY.has(key);
}

export function businessCategoryLabel(key: string, locale: Locale): string {
  const c = BY_KEY.get(key);
  if (!c) return key;
  return locale === "ka" ? c.ka : c.en;
}

export function businessCategoryIcon(key: string): string {
  return BY_KEY.get(key)?.icon ?? "🏢";
}
