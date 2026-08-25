// Auto-market constants: curated makes, body types, drivetrain/fuel/
// transmission enums, the feature checklist and report reasons — with
// bilingual labels. Same shape as estate.ts / market.ts.

import type { Locale } from "@/i18n/config";
import type { LabelDef } from "@/lib/market";

export type AutoKind = "SALE" | "RENT";
export const isAutoKind = (v: unknown): v is AutoKind => v === "SALE" || v === "RENT";

// Makes common on the US market. "other" lets sellers type their own.
export const AUTO_MAKES: string[] = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge",
  "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia",
  "Land Rover", "Lexus", "Lincoln", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan",
  "Polestar", "Porsche", "Ram", "Rivian", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo",
];
export const AUTO_MAKE_KEYS = AUTO_MAKES.map((m) => makeKey(m));

export function makeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
export function makeName(key: string, other?: string | null): string {
  if (key === "other") return other?.trim() || "Other";
  return AUTO_MAKES.find((m) => makeKey(m) === key) ?? key;
}
export const isAutoMake = (v: unknown): v is string =>
  typeof v === "string" && (v === "other" || AUTO_MAKE_KEYS.includes(v));

export const AUTO_BODY_TYPES: LabelDef[] = [
  { key: "sedan", icon: "🚗", en: "Sedan", ka: "სედანი" },
  { key: "suv", icon: "🚙", en: "SUV / Crossover", ka: "ჯიპი / კროსოვერი" },
  { key: "truck", icon: "🛻", en: "Pickup truck", ka: "პიკაპი" },
  { key: "van", icon: "🚐", en: "Van / Minivan", ka: "ვენი / მინივენი" },
  { key: "hatchback", icon: "🚘", en: "Hatchback", ka: "ჰეჩბეკი" },
  { key: "wagon", icon: "🚙", en: "Wagon", ka: "უნივერსალი" },
  { key: "coupe", icon: "🏎️", en: "Coupe", ka: "კუპე" },
  { key: "convertible", icon: "🌤️", en: "Convertible", ka: "კაბრიოლეტი" },
  { key: "motorcycle", icon: "🏍️", en: "Motorcycle", ka: "მოტოციკლი" },
  { key: "other", icon: "🚜", en: "Other", ka: "სხვა" },
];

export const AUTO_TRANSMISSIONS: LabelDef[] = [
  { key: "AUTOMATIC", icon: "🅰️", en: "Automatic", ka: "ავტომატიკა" },
  { key: "MANUAL", icon: "🅼", en: "Manual", ka: "მექანიკა" },
];
export const AUTO_FUELS: LabelDef[] = [
  { key: "GAS", icon: "⛽", en: "Gasoline", ka: "ბენზინი" },
  { key: "DIESEL", icon: "🛢️", en: "Diesel", ka: "დიზელი" },
  { key: "HYBRID", icon: "🔋", en: "Hybrid", ka: "ჰიბრიდი" },
  { key: "ELECTRIC", icon: "⚡", en: "Electric", ka: "ელექტრო" },
];
export const AUTO_DRIVETRAINS: LabelDef[] = [
  { key: "FWD", icon: "↦", en: "Front-wheel drive", ka: "წინა წამყვანი" },
  { key: "RWD", icon: "↤", en: "Rear-wheel drive", ka: "უკანა წამყვანი" },
  { key: "AWD", icon: "⇔", en: "All-wheel drive", ka: "სრული წამყვანი" },
  { key: "FOURWD", icon: "⛰️", en: "4WD", ka: "4x4" },
];
export const AUTO_CONDITIONS: LabelDef[] = [
  { key: "USED", icon: "🚗", en: "Used", ka: "მეორადი" },
  { key: "NEW", icon: "✨", en: "New", ka: "ახალი" },
];

// Feature checklist. `rental: true` items only show on rental listings.
export type AutoFeature = LabelDef & { rental?: boolean };
export const AUTO_FEATURES: AutoFeature[] = [
  { key: "ac", icon: "❄️", en: "Air conditioning", ka: "კონდიციონერი" },
  { key: "heatedSeats", icon: "🔥", en: "Heated seats", ka: "გათბობადი სავარძლები" },
  { key: "leather", icon: "🪑", en: "Leather seats", ka: "ტყავის სალონი" },
  { key: "sunroof", icon: "🌞", en: "Sunroof", ka: "ლუქი" },
  { key: "navigation", icon: "🗺️", en: "Navigation", ka: "ნავიგაცია" },
  { key: "carplay", icon: "📱", en: "Apple CarPlay / Android Auto", ka: "CarPlay / Android Auto" },
  { key: "bluetooth", icon: "🎧", en: "Bluetooth", ka: "Bluetooth" },
  { key: "backupCamera", icon: "📷", en: "Backup camera", ka: "უკანა კამერა" },
  { key: "parkingSensors", icon: "📡", en: "Parking sensors", ka: "პარკინგის სენსორები" },
  { key: "blindSpot", icon: "👁️", en: "Blind-spot monitor", ka: "ბრმა ზონის მონიტორი" },
  { key: "adaptiveCruise", icon: "🛣️", en: "Adaptive cruise control", ka: "ადაპტიური კრუიზ-კონტროლი" },
  { key: "laneAssist", icon: "↔️", en: "Lane assist", ka: "ზოლის ასისტენტი" },
  { key: "remoteStart", icon: "🔑", en: "Remote start", ka: "დისტანციური ჩართვა" },
  { key: "keyless", icon: "🔓", en: "Keyless entry", ka: "უგასაღებო შესვლა" },
  { key: "thirdRow", icon: "👨‍👩‍👧‍👦", en: "Third-row seating", ka: "მესამე რიგი" },
  { key: "towPackage", icon: "🪝", en: "Tow package", ka: "საბუქსირე" },
  { key: "roofRack", icon: "🧳", en: "Roof rack", ka: "საბარგული სახურავზე" },
  { key: "alloyWheels", icon: "⚙️", en: "Alloy wheels", ka: "ტიტანის დისკები" },
  { key: "cleanTitle", icon: "📄", en: "Clean title", ka: "სუფთა ტაიტლი" },
  { key: "oneOwner", icon: "1️⃣", en: "One owner", ka: "ერთი მფლობელი" },
  { key: "serviceRecords", icon: "🧾", en: "Service records", ka: "სერვისის ისტორია" },
  { key: "warranty", icon: "🛡️", en: "Warranty", ka: "გარანტია" },
  // Rental-only
  { key: "unlimitedMiles", icon: "♾️", en: "Unlimited miles", ka: "შეუზღუდავი გარბენი", rental: true },
  { key: "childSeat", icon: "👶", en: "Child seat available", ka: "საბავშვო სავარძელი", rental: true },
  { key: "delivery", icon: "🚚", en: "Delivery available", ka: "მიწოდება შესაძლებელია", rental: true },
  { key: "airportPickup", icon: "✈️", en: "Airport pickup", ka: "აეროპორტიდან წაყვანა", rental: true },
  { key: "longTerm", icon: "📅", en: "Long-term discounts", ka: "გრძელვადიანი ფასდაკლება", rental: true },
  { key: "gps", icon: "🧭", en: "GPS included", ka: "GPS ფასში", rental: true },
];
const FEATURE_KEYS = new Set(AUTO_FEATURES.map((f) => f.key));
export const isAutoFeature = (v: unknown): v is string => typeof v === "string" && FEATURE_KEYS.has(v);

export const AUTO_STATUSES = ["ACTIVE", "SOLD", "PAUSED"] as const;
export type AutoStatus = (typeof AUTO_STATUSES)[number];

export const AUTO_REPORT_REASONS: LabelDef[] = [
  { key: "scam", icon: "🚫", en: "Scam or fake listing", ka: "თაღლითობა ან ყალბი განცხადება" },
  { key: "wrongInfo", icon: "❗", en: "Wrong price, mileage or details", ka: "არასწორი ფასი, გარბენი ან დეტალები" },
  { key: "unavailable", icon: "🚗", en: "Already sold / rented", ka: "უკვე გაყიდულია / გაქირავებულია" },
  { key: "title", icon: "📄", en: "Title or ownership problem", ka: "ტაიტლის / საკუთრების პრობლემა" },
  { key: "spam", icon: "📢", en: "Spam or duplicate", ka: "სპამი ან დუბლიკატი" },
  { key: "other", icon: "💬", en: "Something else", ka: "სხვა" },
];
export const isAutoReportReason = (v: unknown): v is string =>
  typeof v === "string" && AUTO_REPORT_REASONS.some((r) => r.key === v);

export const AUTO_SORTS = ["newest", "nearest", "priceAsc", "priceDesc", "yearDesc", "mileageAsc"] as const;
export type AutoSort = (typeof AUTO_SORTS)[number];
export const isAutoSort = (v: unknown): v is AutoSort =>
  typeof v === "string" && (AUTO_SORTS as readonly string[]).includes(v);

export const AUTO_MIN_YEAR = 1950;
export const AUTO_MAX_YEAR = new Date().getFullYear() + 1;

function byKey(list: LabelDef[], key: string | null | undefined) {
  return key ? list.find((x) => x.key === key) : undefined;
}
export function autoLabel(list: LabelDef[], key: string | null | undefined, locale: Locale): string {
  const d = byKey(list, key);
  return d ? (locale === "ka" ? d.ka : d.en) : (key ?? "");
}
export function autoIcon(list: LabelDef[], key: string | null | undefined, fallback = "🚗"): string {
  return byKey(list, key)?.icon ?? fallback;
}

export function autoTitle(year: number, make: string, makeOther: string | null | undefined, model: string): string {
  return `${year} ${makeName(make, makeOther)} ${model}`.replace(/\s+/g, " ").trim();
}

export function formatMiles(n: number): string {
  return `${n.toLocaleString("en-US")} mi`;
}
