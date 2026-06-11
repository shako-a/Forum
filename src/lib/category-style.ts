// Per-category accent color + icon, matching the GeoGlobally mockup.
// Keyed by category slug (see prisma/seed.ts). Falls back to a neutral style.
type CatStyle = { color: string; icon: string };

const STYLES: Record<string, CatStyle> = {
  discussions: { color: "#5b8def", icon: "💬" },
  employment: { color: "#d7263d", icon: "💼" },
  housing: { color: "#2bb673", icon: "🏠" },
  automobile: { color: "#f2994a", icon: "🚚" },
  legal: { color: "#1f4e9c", icon: "⚖️" },
  marketplace: { color: "#9b51e0", icon: "🛒" },
  assistance: { color: "#e2557b", icon: "🤝" },
  services: { color: "#27aab0", icon: "🛠️" },
  networking: { color: "#7d8aa0", icon: "🔗" },
};

const FALLBACK: CatStyle = { color: "#7d8aa0", icon: "•" };

export function categoryStyle(slug: string): CatStyle {
  return STYLES[slug] ?? FALLBACK;
}
