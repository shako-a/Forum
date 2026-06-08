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
