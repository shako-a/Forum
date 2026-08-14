// User appearance preferences — the Supporter "feed customization" perk.
//
// Everything here only changes what the signed-in user themselves sees, so
// none of it is a moderation surface. It is expressed purely as overrides of
// the design tokens already in globals.css, which means no per-user
// stylesheets and no extra CSS: a few hundred bytes of inline custom
// properties per request.
//
// GROUND RULE: preferences that affect *accessibility* (text size, reduced
// motion, dyslexia-friendly fonts) must never sit behind the paid gate. The
// FREE_PREF_KEYS / PAID_PREF_KEYS split below exists to keep that honest as
// more options are added — aesthetics can be a perk, legibility cannot.

export const DENSITIES = ["comfortable", "compact"] as const;
export const RADII = ["rounded", "soft", "square"] as const;
export const DEPTHS = ["full", "subtle", "flat"] as const;

export type Density = (typeof DENSITIES)[number];
export type Radius = (typeof RADII)[number];
export type Depth = (typeof DEPTHS)[number];

/** Aesthetic-only: fine to gate behind Supporter. */
export const PAID_PREF_KEYS = [
  "themePalette",
  "themeAccent",
  "themeDensity",
  "themeRadius",
  "themeDepth",
] as const;

/** Accessibility-affecting: always free, for every user, forever. */
export const FREE_PREF_KEYS: readonly string[] = [
  // (none yet — text scale / reduced motion / dyslexia font land here)
];

export type AppearancePrefs = {
  themePalette: string;
  themeAccent: string | null;
  themeDensity: string;
  themeRadius: string;
  themeDepth: string;
};

export const DEFAULT_PREFS: AppearancePrefs = {
  themePalette: "default",
  themeAccent: null,
  themeDensity: "comfortable",
  themeRadius: "rounded",
  themeDepth: "full",
};

// --- palettes ---------------------------------------------------------------
// Curated so every option is a sane starting point. Users can still pick a
// custom colour; the contrast clamp below is what keeps that safe.
export type Palette = { id: string; accent: string };

export const PALETTES: Palette[] = [
  { id: "default", accent: "#d7263d" }, // the Georgian cross red
  { id: "ocean", accent: "#2563eb" },
  { id: "forest", accent: "#2e8b57" },
  { id: "plum", accent: "#7c3aed" },
  { id: "amber", accent: "#b45309" },
  { id: "teal", accent: "#0f766e" },
  { id: "rose", accent: "#db2777" },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);
/** Sentinel for "user picked their own colour". */
export const CUSTOM_PALETTE = "custom";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The accent a user's prefs resolve to, falling back to the brand red. */
export function resolveAccent(prefs: AppearancePrefs): string {
  if (prefs.themePalette === CUSTOM_PALETTE) {
    return prefs.themeAccent && HEX.test(prefs.themeAccent) ? prefs.themeAccent : PALETTES[0].accent;
  }
  return (PALETTES.find((p) => p.id === prefs.themePalette) ?? PALETTES[0]).accent;
}

// --- contrast -----------------------------------------------------------
// A free colour picker will happily produce unreadable pages (pale yellow
// text on white). Rather than restricting the picker, we keep the user's hue
// and nudge its lightness until it clears WCAG AA against the surface it will
// actually sit on. The user gets their colour; the text stays readable.

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** WCAG relative luminance. */
function luminance({ r, g, b }: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function mix(color: RGB, toward: RGB, amount: number): RGB {
  return {
    r: color.r + (toward.r - color.r) * amount,
    g: color.g + (toward.g - color.g) * amount,
    b: color.b + (toward.b - color.b) * amount,
  };
}

/**
 * Nudge `accent` toward black or white (whichever direction increases
 * contrast against `surface`) until it clears `target`, preserving hue.
 * Returns the original when it already passes.
 */
export function ensureContrast(accent: string, surface: string, target = 4.5): string {
  if (!HEX.test(accent) || !HEX.test(surface)) return accent;
  if (contrastRatio(accent, surface) >= target) return accent;

  // Darken on light surfaces, lighten on dark ones.
  const surfaceIsLight = luminance(hexToRgb(surface)) > 0.5;
  const toward: RGB = surfaceIsLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  const base = hexToRgb(accent);

  // 20 steps is finer than the eye can distinguish here and always terminates.
  for (let i = 1; i <= 20; i++) {
    const candidate = rgbToHex(mix(base, toward, i / 20));
    if (contrastRatio(candidate, surface) >= target) return candidate;
  }
  return rgbToHex(toward); // pathological: fall back to pure black/white
}

/**
 * Text colour to place *on* a solid accent fill (e.g. primary buttons).
 * Picking the better of white/near-black keeps the user's chosen fill intact
 * instead of forcing the accent itself darker.
 */
export function onAccent(accent: string): string {
  const dark = "#0b0f18";
  return contrastRatio(accent, "#ffffff") >= contrastRatio(accent, dark) ? "#ffffff" : dark;
}

// --- CSS emission -----------------------------------------------------------
// Surfaces the accent has to remain legible against, per theme.
const LIGHT_SURFACE = "#ffffff";
const DARK_SURFACE = "#131b2b";

const DENSITY_CSS: Record<Density, string> = {
  comfortable: "",
  compact: "--card-pad:10px 14px 8px;--feed-gap:9px;--pad-card:13px;--title-size:15.5px;",
};

const RADIUS_CSS: Record<Radius, string> = {
  rounded: "",
  soft: "--radius:9px;--radius-sm:7px;",
  square: "--radius:2px;--radius-sm:2px;",
};

function sanitize(hex: string): string {
  // Values are validated before storage, but this is what gets inlined into
  // the document — never emit anything that isn't a plain hex colour.
  return HEX.test(hex) ? hex : PALETTES[0].accent;
}

/**
 * The <style> body implementing a user's preferences.
 *
 * Both themes are emitted up front (light in `:root`, dark under
 * `[data-theme="dark"]`) because the theme is chosen client-side — this way
 * switching themes needs no round trip and never flashes.
 */
export function appearanceCss(prefs: AppearancePrefs): string {
  const accent = sanitize(resolveAccent(prefs));
  const density = (DENSITIES as readonly string[]).includes(prefs.themeDensity)
    ? (prefs.themeDensity as Density)
    : "comfortable";
  const radius = (RADII as readonly string[]).includes(prefs.themeRadius)
    ? (prefs.themeRadius as Radius)
    : "rounded";
  const depth = (DEPTHS as readonly string[]).includes(prefs.themeDepth)
    ? (prefs.themeDepth as Depth)
    : "full";

  const lightAccent = ensureContrast(accent, LIGHT_SURFACE);
  const darkAccent = ensureContrast(accent, DARK_SURFACE);
  const on = onAccent(accent);

  const shared = `${DENSITY_CSS[density]}${RADIUS_CSS[radius]}`;

  // --red is the action/identity colour throughout globals.css, so overriding
  // it (and its two derivatives) repaints buttons, active nav and the brand
  // mark. --blue is deliberately left alone so links keep their meaning.
  const rules: string[] = [
    `:root{--red:${lightAccent};--red-deep:${ensureContrast(lightAccent, LIGHT_SURFACE, 7)};` +
      `--red-soft:color-mix(in srgb, ${lightAccent} 12%, transparent);` +
      `--accent-solid:${accent};--accent-on:${on};${shared}}`,
    `[data-theme="dark"]{--red:${darkAccent};--red-deep:${ensureContrast(darkAccent, DARK_SURFACE, 7)};` +
      `--red-soft:color-mix(in srgb, ${darkAccent} 16%, transparent);` +
      `--accent-solid:${accent};--accent-on:${on};}`,
    // Solid fills keep the exact colour the user picked, with whichever text
    // colour is actually legible on it.
    `.btn-primary{background:var(--accent-solid);color:var(--accent-on);}`,
  ];

  if (depth === "subtle") {
    rules.push(`body::before{opacity:.45}body::after{opacity:.5}`);
  } else if (depth === "flat") {
    // Also drops the parallax work, so "flat" is a small performance win too.
    rules.push(`body::before,body::after{display:none}`);
  }

  return rules.join("");
}

/** True when these prefs differ from the defaults (i.e. worth emitting CSS). */
export function isCustomized(prefs: AppearancePrefs): boolean {
  return (
    prefs.themePalette !== DEFAULT_PREFS.themePalette ||
    prefs.themeDensity !== DEFAULT_PREFS.themeDensity ||
    prefs.themeRadius !== DEFAULT_PREFS.themeRadius ||
    prefs.themeDepth !== DEFAULT_PREFS.themeDepth
  );
}
