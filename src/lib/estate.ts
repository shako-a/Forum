// Real-estate module constants: curated property types and feature keys
// (stored on PropertyListing.propertyType / .features), with bilingual labels.
// Mirrors the shape of business-categories.ts.

import type { Locale } from "@/i18n/config";

export type EstateKind = "SALE" | "RENT";
export const ESTATE_KINDS: EstateKind[] = ["SALE", "RENT"];
export function isEstateKind(v: unknown): v is EstateKind {
  return v === "SALE" || v === "RENT";
}

export type PropertyTypeDef = { key: string; icon: string; en: string; ka: string };

export const PROPERTY_TYPES: PropertyTypeDef[] = [
  { key: "apartment", icon: "🏢", en: "Apartment", ka: "ბინა" },
  { key: "house", icon: "🏠", en: "House", ka: "სახლი" },
  { key: "condo", icon: "🏙️", en: "Condo", ka: "კონდო" },
  { key: "townhouse", icon: "🏘️", en: "Townhouse", ka: "თაუნჰაუსი" },
  { key: "room", icon: "🛏️", en: "Room", ka: "ოთახი" },
  { key: "land", icon: "🌳", en: "Land / Lot", ka: "მიწის ნაკვეთი" },
  { key: "commercial", icon: "🏪", en: "Commercial", ka: "კომერციული" },
  { key: "office", icon: "🖥️", en: "Office", ka: "ოფისი" },
];

export function isPropertyType(v: unknown): v is string {
  return typeof v === "string" && PROPERTY_TYPES.some((t) => t.key === v);
}

export function propertyTypeLabel(key: string, locale: Locale): string {
  const t = PROPERTY_TYPES.find((x) => x.key === key);
  return t ? (locale === "ka" ? t.ka : t.en) : key;
}

export function propertyTypeIcon(key: string): string {
  return PROPERTY_TYPES.find((x) => x.key === key)?.icon ?? "🏠";
}

// Feature checklist offered when creating/editing a listing.
export type FeatureDef = { key: string; icon: string; en: string; ka: string };

export const ESTATE_FEATURES: FeatureDef[] = [
  { key: "parking", icon: "🅿️", en: "Parking", ka: "პარკინგი" },
  { key: "garage", icon: "🚗", en: "Garage", ka: "გარაჟი" },
  { key: "balcony", icon: "🌇", en: "Balcony", ka: "აივანი" },
  { key: "elevator", icon: "🛗", en: "Elevator", ka: "ლიფტი" },
  { key: "furnished", icon: "🛋️", en: "Furnished", ka: "ავეჯით" },
  { key: "ac", icon: "❄️", en: "Air conditioning", ka: "კონდიციონერი" },
  { key: "heating", icon: "🔥", en: "Central heating", ka: "ცენტრალური გათბობა" },
  { key: "dishwasher", icon: "🍽️", en: "Dishwasher", ka: "ჭურჭლის სარეცხი" },
  { key: "laundry", icon: "🧺", en: "Washer / dryer", ka: "სარეცხი მანქანა" },
  { key: "pool", icon: "🏊", en: "Pool", ka: "აუზი" },
  { key: "gym", icon: "🏋️", en: "Gym", ka: "სავარჯიშო დარბაზი" },
  { key: "pets", icon: "🐾", en: "Pets allowed", ka: "შინაური ცხოველები დაშვებულია" },
  { key: "storage", icon: "📦", en: "Storage", ka: "სათავსო" },
  { key: "fireplace", icon: "🪵", en: "Fireplace", ka: "ბუხარი" },
  { key: "yard", icon: "🌿", en: "Yard / garden", ka: "ეზო / ბაღი" },
  { key: "security", icon: "🔒", en: "Security system", ka: "დაცვის სისტემა" },
  { key: "accessible", icon: "♿", en: "Wheelchair accessible", ka: "ადაპტირებული" },
  { key: "transit", icon: "🚇", en: "Near public transit", ka: "ტრანსპორტთან ახლოს" },
  { key: "utilities", icon: "💡", en: "Utilities included", ka: "კომუნალურები ფასში" },
  { key: "renovated", icon: "✨", en: "Newly renovated", ka: "ახალი რემონტით" },
];

const FEATURE_KEYS = new Set(ESTATE_FEATURES.map((f) => f.key));
export function isEstateFeature(v: unknown): v is string {
  return typeof v === "string" && FEATURE_KEYS.has(v);
}

export function featureLabel(key: string, locale: Locale): string {
  const f = ESTATE_FEATURES.find((x) => x.key === key);
  return f ? (locale === "ka" ? f.ka : f.en) : key;
}

export function featureIcon(key: string): string {
  return ESTATE_FEATURES.find((x) => x.key === key)?.icon ?? "✓";
}

// "$250,000" for sales, "$1,200/mo" for rentals (suffix localized by caller).
export function formatPrice(price: number): string {
  return "$" + price.toLocaleString("en-US");
}

// Why a real-estate listing gets reported.
export const ESTATE_REPORT_REASONS: FeatureDef[] = [
  { key: "scam", icon: "🚫", en: "Scam or fake listing", ka: "თაღლითობა ან ყალბი განცხადება" },
  { key: "wrongInfo", icon: "❗", en: "Wrong price, address or details", ka: "არასწორი ფასი, მისამართი ან დეტალები" },
  { key: "unavailable", icon: "🏚️", en: "Already sold / rented", ka: "უკვე გაყიდულია / გაქირავებულია" },
  { key: "discrimination", icon: "⚖️", en: "Discriminatory terms", ka: "დისკრიმინაციული პირობები" },
  { key: "spam", icon: "📢", en: "Spam or duplicate", ka: "სპამი ან დუბლიკატი" },
  { key: "other", icon: "💬", en: "Something else", ka: "სხვა" },
];
export const isEstateReportReason = (v: unknown): v is string =>
  typeof v === "string" && ESTATE_REPORT_REASONS.some((r) => r.key === v);
