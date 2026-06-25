import type { Locale } from "@/i18n/config";

// Each user has up to this many consistent anonymous aliases to choose from.
export const ANON_ALIAS_COUNT = 3;

// Word lists + palette for generated aliases. Deterministic per (user, alias),
// so a user's anon persona is stable but unlinkable to their real account by
// the public (the mapping needs the secret userId, never exposed for anon content).
const ADJ = [
  "Quiet", "Bold", "Swift", "Calm", "Brave", "Wise", "Kind", "Lone",
  "Bright", "Noble", "Wild", "Gentle", "Keen", "Sly", "Merry", "Amber",
  "Cobalt", "Crimson", "Olive", "Hidden",
];
const NOUN = [
  "Heron", "Otter", "Maple", "Falcon", "Cedar", "Wolf", "Sparrow", "Birch",
  "Lynx", "Raven", "Ibex", "Marten", "Finch", "Willow", "Stoat", "Tern",
  "Bison", "Crane", "Fox", "Hare",
];
const COLORS = [
  "#d7263d", "#1f4e9c", "#2e8b57", "#b8860b", "#6a3d9c", "#0d8a8a", "#c0563b", "#3a7d44",
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A user's anon alias (1..ANON_ALIAS_COUNT): a stable generated name + color.
export function anonIdentity(userId: string, alias: number): { name: string; color: string; initial: string } {
  const h = hashStr(`${userId}#${alias}`);
  const adj = ADJ[h % ADJ.length];
  const noun = NOUN[(h >>> 5) % NOUN.length];
  const color = COLORS[(h >>> 11) % COLORS.length];
  return { name: `${adj} ${noun}`, color, initial: adj[0] };
}

// The user's pickable anonymous aliases (for the composer identity chooser).
export function aliasOptions(userId: string): { index: number; name: string; color: string }[] {
  return Array.from({ length: ANON_ALIAS_COUNT }, (_, i) => {
    const id = anonIdentity(userId, i + 1);
    return { index: i + 1, name: id.name, color: id.color };
  });
}

// Resolved author identity for rendering. For anonymous content, `realName` is
// only filled in for viewers authorized to de-anonymize.
export type DisplayAuthor = {
  name: string;
  anonymous: boolean;
  color: string | null; // avatar/badge accent for anon
  href: string | null; // profile link — real authors only
  realName: string | null; // revealed real forum name (authorized staff)
};

export function resolveAuthor(
  locale: Locale,
  a: { authorId: string; forumName: string; anonAlias: number | null },
  canReveal = false,
): DisplayAuthor {
  if (a.anonAlias == null) {
    return {
      name: a.forumName,
      anonymous: false,
      color: null,
      href: `/${locale}/u/${a.forumName}`,
      realName: null,
    };
  }
  const id = anonIdentity(a.authorId, a.anonAlias);
  return {
    name: id.name,
    anonymous: true,
    color: id.color,
    href: null,
    realName: canReveal ? a.forumName : null,
  };
}
