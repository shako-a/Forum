import "server-only";
import { db } from "@/lib/db";
import { attachMyVotes, attachSaved } from "@/lib/forum-data";
import { FEED_KIND_FILTER } from "@/lib/post-kinds";
import { marketExpiryCutoff } from "@/lib/market";
import type { ModuleKey } from "@/lib/modules";
import type { FeedPost } from "@/components/PostList";

export type MemberHit = { forumName: string; state: string; city: string | null };

/** One row in the module results: enough for a compact link card. */
export type ListingHit = {
  module: ModuleKey;
  key: string; // slug, or id for jobs
  title: string;
  sub: string | null; // tagline / company / make+model
  price: number | null;
  priceSuffix: "month" | "day" | null;
  place: string | null;
  image: string | null;
  icon: string | null; // emoji fallback when there is no image
};

export type SearchResults = {
  posts: FeedPost[];
  members: MemberHit[];
  listings: Record<ModuleKey, ListingHit[]>;
};

const EMPTY: SearchResults = {
  posts: [],
  members: [],
  listings: { business: [], jobs: [], estate: [], market: [], auto: [] },
};

const TAKE = 12;

function place(city: string | null | undefined, state: string | null | undefined): string | null {
  const s = [city, state].filter(Boolean).join(", ");
  return s || null;
}

/**
 * Site-wide search. Threads by title, members by forum name, and every
 * marketplace module by its title-like fields — the same `contains` matches
 * the module directories already use, so a search that finds something here
 * finds it there too. Guests don't see locked-category posts.
 */
export async function searchAll(query: string, viewer: { id: string } | null): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;
  const ci = { contains: q, mode: "insensitive" as const };

  const [found, members, businesses, jobs, estate, market, auto] = await Promise.all([
    db.post.findMany({
      where: {
        hidden: false,
        ...FEED_KIND_FILTER,
        title: ci,
        ...(viewer ? {} : { category: { locked: false } }),
      },
      orderBy: [{ score: "desc" }, { lastActivity: "desc" }],
      take: 30,
      include: {
        author: { select: { forumName: true } },
        authorBusiness: { select: { name: true, slug: true, logoUrl: true } },
        category: true,
        _count: { select: { replies: true, votes: true, rsvps: true } },
      },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", forumName: ci },
      orderBy: { forumName: "asc" },
      take: TAKE,
      select: { forumName: true, state: true, city: true },
    }),
    db.business.findMany({
      where: { OR: [{ name: ci }, { tagline: ci }, { description: ci }] },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: TAKE,
      select: { slug: true, name: true, tagline: true, city: true, state: true, logoUrl: true, photos: true },
    }),
    db.jobPosting.findMany({
      where: { active: true, OR: [{ title: ci }, { description: ci }, { business: { name: ci } }] },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { id: true, title: true, pay: true, city: true, state: true, business: { select: { name: true, logoUrl: true } } },
    }),
    db.propertyListing.findMany({
      where: { active: true, OR: [{ title: ci }, { description: ci }, { address: ci }, { city: ci }] },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { slug: true, title: true, kind: true, price: true, city: true, state: true, photos: true },
    }),
    db.marketListing.findMany({
      where: { status: "ACTIVE", bumpedAt: { gte: marketExpiryCutoff() }, OR: [{ title: ci }, { description: ci }] },
      orderBy: { bumpedAt: "desc" },
      take: TAKE,
      select: { slug: true, title: true, price: true, city: true, state: true, photos: true },
    }),
    db.autoListing.findMany({
      where: { status: "ACTIVE", OR: [{ title: ci }, { description: ci }, { model: ci }, { make: ci }, { color: ci }] },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      select: { slug: true, title: true, kind: true, price: true, city: true, state: true, photos: true },
    }),
  ]);

  const posts = await attachSaved(await attachMyVotes(found, viewer?.id ?? null), viewer?.id ?? null);

  return {
    posts,
    members,
    listings: {
      business: businesses.map((b) => ({
        module: "business",
        key: b.slug,
        title: b.name,
        sub: b.tagline,
        price: null,
        priceSuffix: null,
        place: place(b.city, b.state),
        image: b.logoUrl ?? b.photos[0] ?? null,
        icon: "🏢",
      })),
      jobs: jobs.map((j) => ({
        module: "jobs",
        key: j.id,
        title: j.title,
        sub: [j.business?.name, j.pay].filter(Boolean).join(" · ") || null,
        price: null,
        priceSuffix: null,
        place: place(j.city, j.state),
        image: j.business?.logoUrl ?? null,
        icon: "💼",
      })),
      estate: estate.map((l) => ({
        module: "estate",
        key: l.slug,
        title: l.title,
        sub: null,
        price: l.price,
        priceSuffix: l.kind === "RENT" ? "month" : null,
        place: place(l.city, l.state),
        image: l.photos[0] ?? null,
        icon: "🏠",
      })),
      market: market.map((l) => ({
        module: "market",
        key: l.slug,
        title: l.title,
        sub: null,
        price: l.price,
        priceSuffix: null,
        place: place(l.city, l.state),
        image: l.photos[0] ?? null,
        icon: "🛍️",
      })),
      auto: auto.map((l) => ({
        module: "auto",
        key: l.slug,
        title: l.title,
        sub: null,
        price: l.price,
        priceSuffix: l.kind === "RENT" ? "day" : null,
        place: place(l.city, l.state),
        image: l.photos[0] ?? null,
        icon: "🚗",
      })),
    },
  };
}
