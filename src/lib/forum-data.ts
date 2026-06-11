import "server-only";
import { db } from "@/lib/db";

// These loaders degrade gracefully: if the database isn't reachable yet
// (e.g. before the first `prisma migrate`), they return empty results so the
// UI still renders instead of crashing. Real errors are logged.

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

export async function getHomeData(viewerIsAuthed: boolean) {
  try {
    const [categories, posts, topAds, sidebarAds] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.post.findMany({
        where: { hidden: false },
        orderBy: { lastActivity: "desc" },
        take: 20,
        include: {
          author: { select: { forumName: true } },
          category: true,
          _count: { select: { replies: true, votes: true } },
        },
      }),
      db.adCard.findMany({
        where: { active: true, placement: "TOP_PANEL" },
        orderBy: { sortOrder: "asc" },
      }),
      db.adCard.findMany({
        where: { active: true, placement: "SIDEBAR" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    // Guests can see locked categories' names but not their posts; filtering of
    // gated post bodies happens at the category/post level. Home feed only shows
    // posts from unlocked categories to guests.
    const visiblePosts = viewerIsAuthed
      ? posts
      : posts.filter((p) => !p.category.locked);

    return { categories, posts: visiblePosts, topAds, sidebarAds, dbReady: true };
  } catch (error) {
    console.error("getHomeData failed (is the database running & migrated?):", error);
    return {
      categories: [],
      posts: [],
      topAds: [],
      sidebarAds: [],
      dbReady: false,
    };
  }
}

const POST_CARD_INCLUDE = {
  author: { select: { forumName: true } },
  category: true,
  _count: { select: { replies: true, votes: true } },
} as const;

// A single category page: the category plus its posts (most recent first).
// Locked categories return `gated: true` with no posts for guests.
export async function getCategoryPage(slug: string, viewerIsAuthed: boolean) {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return null;

  if (category.locked && !viewerIsAuthed) {
    return { category, posts: [], gated: true };
  }

  const posts = await db.post.findMany({
    where: { categoryId: category.id, hidden: false },
    orderBy: { lastActivity: "desc" },
    take: 50,
    include: POST_CARD_INCLUDE,
  });
  return { category, posts, gated: false };
}

// The categories overview: every category with its 3 most recently discussed
// posts. Locked categories show no posts to guests (names stay visible).
export async function getCategoriesIndex(viewerIsAuthed: boolean) {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        posts: {
          where: { hidden: false },
          orderBy: { lastActivity: "desc" },
          take: 3,
          select: { id: true, slug: true, title: true, lastActivity: true },
        },
        _count: { select: { posts: true } },
      },
    });

    return categories.map((c) => ({
      ...c,
      posts: c.locked && !viewerIsAuthed ? [] : c.posts,
    }));
  } catch (error) {
    console.error("getCategoriesIndex failed:", error);
    return [];
  }
}
