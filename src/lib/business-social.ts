// Business storefront vocabulary: social platforms, languages spoken, payment
// methods, and the free-form detail rows. Client-safe so the form and the
// page agree on one list.
import type { Locale } from "@/i18n/config";

export type SocialKey = "facebook" | "instagram" | "tiktok" | "youtube" | "telegram";
export type SocialField = "socialFacebook" | "socialInstagram" | "socialTiktok" | "socialYoutube" | "socialTelegram";

export type SocialPlatform = {
  key: SocialKey;
  field: SocialField;
  label: string;
  icon: string;
  placeholder: string;
  fromHandle: (handle: string) => string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "facebook", field: "socialFacebook", label: "Facebook", icon: "📘", placeholder: "facebook.com/yourpage", fromHandle: (h) => `https://www.facebook.com/${h}` },
  { key: "instagram", field: "socialInstagram", label: "Instagram", icon: "📸", placeholder: "@yourname", fromHandle: (h) => `https://www.instagram.com/${h}` },
  { key: "tiktok", field: "socialTiktok", label: "TikTok", icon: "🎵", placeholder: "@yourname", fromHandle: (h) => `https://www.tiktok.com/@${h}` },
  { key: "youtube", field: "socialYoutube", label: "YouTube", icon: "▶️", placeholder: "@yourchannel", fromHandle: (h) => `https://www.youtube.com/@${h}` },
  { key: "telegram", field: "socialTelegram", label: "Telegram", icon: "✈️", placeholder: "@yourchannel", fromHandle: (h) => `https://t.me/${h}` },
];

/**
 * A stored value may be a full URL or a bare handle ("@geoglobally"). Either
 * becomes a link; anything else (spaces, injection attempts) becomes nothing.
 */
export function socialUrl(platform: SocialPlatform, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s.length <= 300 ? s : null;
  const handle = s.replace(/^@/, "").replace(/^\/+/, "");
  if (!/^[\w.\-/]{1,100}$/.test(handle)) return null;
  return platform.fromHandle(handle);
}

export type SocialLink = { key: SocialKey; label: string; icon: string; href: string };

/** Every platform the business filled in, as links. */
export function socialLinks(biz: Partial<Record<SocialField, string | null>>): SocialLink[] {
  const out: SocialLink[] = [];
  for (const p of SOCIAL_PLATFORMS) {
    const href = socialUrl(p, biz[p.field]);
    if (href) out.push({ key: p.key, label: p.label, icon: p.icon, href });
  }
  return out;
}

/** wa.me link for an international number; null if it isn't one. */
export function whatsappUrl(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

export type KeyedLabel = { key: string; en: string; ka: string };

export const LANGUAGES: KeyedLabel[] = [
  { key: "ka", en: "Georgian", ka: "ქართული" },
  { key: "en", en: "English", ka: "ინგლისური" },
  { key: "ru", en: "Russian", ka: "რუსული" },
  { key: "es", en: "Spanish", ka: "ესპანური" },
  { key: "uk", en: "Ukrainian", ka: "უკრაინული" },
  { key: "tr", en: "Turkish", ka: "თურქული" },
  { key: "hy", en: "Armenian", ka: "სომხური" },
  { key: "de", en: "German", ka: "გერმანული" },
];

export const PAYMENT_METHODS: KeyedLabel[] = [
  { key: "cash", en: "Cash", ka: "ნაღდი" },
  { key: "card", en: "Card", ka: "ბარათი" },
  { key: "zelle", en: "Zelle", ka: "Zelle" },
  { key: "venmo", en: "Venmo", ka: "Venmo" },
  { key: "paypal", en: "PayPal", ka: "PayPal" },
  { key: "cashapp", en: "Cash App", ka: "Cash App" },
  { key: "applepay", en: "Apple Pay", ka: "Apple Pay" },
  { key: "crypto", en: "Crypto", ka: "კრიპტო" },
];

export function keyedLabel(list: KeyedLabel[], key: string, locale: Locale): string {
  const d = list.find((x) => x.key === key);
  return d ? (locale === "ka" ? d.ka : d.en) : key;
}

/** Keep only known keys, deduplicated, in catalogue order. */
export function pickKeys(list: KeyedLabel[], raw: string[]): string[] {
  const wanted = new Set(raw.map(String));
  return list.filter((x) => wanted.has(x.key)).map((x) => x.key);
}

// Free-form specification rows: "Delivery — yes", "Cuisine — Georgian".
export type DetailRow = { label: string; value: string };
export const DETAILS_MAX = 20;
const DETAIL_LEN = 60;

/** Stored Json → rows. Tolerates anything: a bad row is dropped, never thrown on. */
export function parseDetails(json: unknown): DetailRow[] {
  if (!Array.isArray(json)) return [];
  const out: DetailRow[] = [];
  for (const r of json) {
    if (!r || typeof r !== "object") continue;
    const label = String((r as { label?: unknown }).label ?? "").trim().slice(0, DETAIL_LEN);
    const value = String((r as { value?: unknown }).value ?? "").trim().slice(0, DETAIL_LEN);
    if (label && value) out.push({ label, value });
    if (out.length >= DETAILS_MAX) break;
  }
  return out;
}

/** Parallel form arrays → rows, with the same bounds as the stored shape. */
export function detailsFromForm(labels: string[], values: string[]): DetailRow[] {
  const rows: unknown[] = labels.map((label, i) => ({ label, value: values[i] ?? "" }));
  return parseDetails(rows);
}
