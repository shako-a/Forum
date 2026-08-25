// Marketplace constants: curated categories, condition scale, price types,
// statuses and sort orders — with bilingual labels. Mirrors estate.ts.

import type { Locale } from "@/i18n/config";

export type LabelDef = { key: string; icon: string; en: string; ka: string };

export const MARKET_CATEGORIES: LabelDef[] = [
  { key: "electronics", icon: "📱", en: "Electronics", ka: "ელექტრონიკა" },
  { key: "computers", icon: "💻", en: "Computers & office", ka: "კომპიუტერები და ოფისი" },
  { key: "furniture", icon: "🛋️", en: "Furniture", ka: "ავეჯი" },
  { key: "home", icon: "🏡", en: "Home & garden", ka: "სახლი და ბაღი" },
  { key: "appliances", icon: "🧺", en: "Appliances", ka: "საყოფაცხოვრებო ტექნიკა" },
  { key: "clothing", icon: "👗", en: "Clothing & shoes", ka: "ტანსაცმელი და ფეხსაცმელი" },
  { key: "beauty", icon: "💄", en: "Beauty & health", ka: "სილამაზე და ჯანმრთელობა" },
  { key: "kids", icon: "🧸", en: "Kids & baby", ka: "ბავშვები" },
  { key: "sports", icon: "⚽", en: "Sports & outdoors", ka: "სპორტი და დასვენება" },
  { key: "vehicles", icon: "🚗", en: "Vehicles & parts", ka: "ავტო და ნაწილები" },
  { key: "tools", icon: "🔧", en: "Tools & equipment", ka: "ხელსაწყოები" },
  { key: "hobbies", icon: "🎸", en: "Books, music & hobbies", ka: "წიგნები, მუსიკა, ჰობი" },
  { key: "collectibles", icon: "🖼️", en: "Art & collectibles", ka: "ხელოვნება და კოლექციები" },
  { key: "pets", icon: "🐾", en: "Pet supplies", ka: "შინაური ცხოველები" },
  { key: "food", icon: "🫙", en: "Food & homemade", ka: "საკვები და ხელნაკეთი" },
  { key: "other", icon: "📦", en: "Other", ka: "სხვა" },
];

export const MARKET_CONDITIONS: LabelDef[] = [
  { key: "NEW", icon: "✨", en: "New", ka: "ახალი" },
  { key: "LIKE_NEW", icon: "🌟", en: "Like new", ka: "თითქმის ახალი" },
  { key: "GOOD", icon: "👍", en: "Good", ka: "კარგი" },
  { key: "FAIR", icon: "👌", en: "Fair", ka: "დამაკმაყოფილებელი" },
  { key: "PARTS", icon: "🔩", en: "For parts / not working", ka: "ნაწილებად / არ მუშაობს" },
];

export const MARKET_PRICE_TYPES: LabelDef[] = [
  { key: "FIXED", icon: "🏷️", en: "Fixed price", ka: "ფიქსირებული ფასი" },
  { key: "NEGOTIABLE", icon: "🤝", en: "Negotiable", ka: "შეთანხმებით" },
  { key: "FREE", icon: "🎁", en: "Free", ka: "უფასოდ" },
];

// Statuses a seller can set. REMOVED is staff-only (set from a report).
export const MARKET_STATUSES = ["ACTIVE", "SOLD", "PAUSED"] as const;
export type MarketStatus = (typeof MARKET_STATUSES)[number];

// Why a listing gets reported — marketplace-specific, unlike post reports.
export const MARKET_REPORT_REASONS: LabelDef[] = [
  { key: "scam", icon: "🚫", en: "Scam or fraud", ka: "თაღლითობა" },
  { key: "prohibited", icon: "⛔", en: "Prohibited or illegal item", ka: "აკრძალული ან უკანონო ნივთი" },
  { key: "misleading", icon: "❗", en: "Misleading description or photos", ka: "შეცდომაში შემყვანი აღწერა ან ფოტოები" },
  { key: "spam", icon: "📢", en: "Spam, duplicate or wrong category", ka: "სპამი, დუბლიკატი ან არასწორი კატეგორია" },
  { key: "offensive", icon: "💢", en: "Offensive content", ka: "შეურაცხმყოფელი კონტენტი" },
  { key: "other", icon: "💬", en: "Something else", ka: "სხვა" },
];
export const isMarketReportReason = (v: unknown): v is string =>
  typeof v === "string" && !!byKey(MARKET_REPORT_REASONS, v);

// Listings drop out of search this many days after their last renew.
export const MARKET_EXPIRY_DAYS = 60;
// A listing can be renewed (bumped to the top) once this many hours have passed.
export const MARKET_RENEW_COOLDOWN_HOURS = 24;

export const MARKET_SORTS = ["newest", "priceAsc", "priceDesc"] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];

function byKey(list: LabelDef[], key: string) {
  return list.find((x) => x.key === key);
}
export const isMarketCategory = (v: unknown): v is string =>
  typeof v === "string" && !!byKey(MARKET_CATEGORIES, v);
export const isMarketCondition = (v: unknown): v is string =>
  typeof v === "string" && !!byKey(MARKET_CONDITIONS, v);
export const isMarketPriceType = (v: unknown): v is string =>
  typeof v === "string" && !!byKey(MARKET_PRICE_TYPES, v);
export const isMarketSort = (v: unknown): v is MarketSort =>
  typeof v === "string" && (MARKET_SORTS as readonly string[]).includes(v);

export function labelOf(list: LabelDef[], key: string, locale: Locale): string {
  const d = byKey(list, key);
  return d ? (locale === "ka" ? d.ka : d.en) : key;
}
export function iconOf(list: LabelDef[], key: string, fallback = "📦"): string {
  return byKey(list, key)?.icon ?? fallback;
}

export function marketExpiryCutoff(now = Date.now()): Date {
  return new Date(now - MARKET_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function isMarketExpired(bumpedAt: Date, now = Date.now()): boolean {
  return bumpedAt.getTime() < marketExpiryCutoff(now).getTime();
}

export function canRenew(bumpedAt: Date, now = Date.now()): boolean {
  return now - bumpedAt.getTime() >= MARKET_RENEW_COOLDOWN_HOURS * 60 * 60 * 1000;
}
