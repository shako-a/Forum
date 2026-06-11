import "server-only";
import { db } from "@/lib/db";
import { pmToHtml, pmPlainText, pmFirstImage } from "@/lib/prosemirror";
import { roleAtLeast } from "@/lib/dal";
import type { Role } from "@/generated/prisma/client";

// These loaders degrade gracefully: if the database isn't reachable yet
// (e.g. before the first `prisma migrate`), they return empty results so the
// UI still renders instead of crashing. Real errors are logged.

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

export async function getHomeData(viewer: { id: string } | null) {
  const viewerIsAuthed = !!viewer;
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
    const postsWithVotes = await attachMyVotes(visiblePosts, viewer?.id ?? null);

    return { categories, posts: postsWithVotes, topAds, sidebarAds, dbReady: true };
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

// Attach the viewer's own vote (-1/0/1) to each post so list cards can render
// interactive, stateful vote controls.
async function attachMyVotes<T extends { id: string }>(
  posts: T[],
  userId: string | null,
): Promise<(T & { myVote: number })[]> {
  if (!userId || posts.length === 0) return posts.map((p) => ({ ...p, myVote: 0 }));
  const votes = await db.postVote.findMany({
    where: { userId, postId: { in: posts.map((p) => p.id) } },
    select: { postId: true, value: true },
  });
  const map = new Map(votes.map((v) => [v.postId, v.value]));
  return posts.map((p) => ({ ...p, myVote: map.get(p.id) ?? 0 }));
}

// A single category page: the category plus its posts (most recent first).
// Locked categories return `gated: true` with no posts for guests.
export async function getCategoryPage(slug: string, viewer: { id: string } | null) {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return null;

  if (category.locked && !viewer) {
    return { category, posts: [], gated: true };
  }

  const found = await db.post.findMany({
    where: { categoryId: category.id, hidden: false },
    orderBy: { lastActivity: "desc" },
    take: 50,
    include: POST_CARD_INCLUDE,
  });
  const posts = await attachMyVotes(found, viewer?.id ?? null);
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

export type ThreadReply = {
  id: string;
  parentId: string | null;
  authorName: string;
  bodyHtml: string;
  createdAt: Date;
  score: number;
  myVote: number;
  hidden: boolean;
  deleted: boolean;
  isOwn: boolean;
  editableText: string;
  imageUrl: string | null;
  children: ThreadReply[];
};

export type ReplySort = "best" | "new" | "old";

// A post plus its threaded replies and the viewer's votes. Gating (hidden /
// locked category) is decided by the caller from the returned `post`.
export async function getPostView(
  slug: string,
  viewer: { id: string; role: Role } | null,
  sort: ReplySort = "best",
) {
  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: { select: { forumName: true } },
      category: true,
      _count: { select: { replies: true } },
    },
  });
  if (!post) return null;

  const isMod = viewer ? roleAtLeast(viewer.role, "MODERATOR") : false;
  const replies = await db.reply.findMany({
    where: { postId: post.id, ...(isMod ? {} : { hidden: false }) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { forumName: true } } },
  });

  // Viewer's existing votes (post + each reply).
  let postMyVote = 0;
  const replyVote = new Map<string, number>();
  if (viewer) {
    const pv = await db.postVote.findUnique({
      where: { userId_postId: { userId: viewer.id, postId: post.id } },
      select: { value: true },
    });
    postMyVote = pv?.value ?? 0;
    if (replies.length) {
      const rvs = await db.replyVote.findMany({
        where: { userId: viewer.id, replyId: { in: replies.map((r) => r.id) } },
        select: { replyId: true, value: true },
      });
      rvs.forEach((v) => replyVote.set(v.replyId, v.value));
    }
  }

  // Build the reply tree.
  const nodes = new Map<string, ThreadReply>();
  for (const r of replies) {
    const deleted = !!r.deletedAt;
    nodes.set(r.id, {
      id: r.id,
      parentId: r.parentId,
      authorName: deleted ? "" : r.author.forumName,
      bodyHtml: deleted ? "" : pmToHtml(r.body),
      createdAt: r.createdAt,
      score: r.score,
      myVote: replyVote.get(r.id) ?? 0,
      hidden: r.hidden,
      deleted,
      isOwn: !deleted && !!viewer && r.authorId === viewer.id,
      editableText: deleted ? "" : pmPlainText(r.body),
      imageUrl: deleted ? null : pmFirstImage(r.body),
      children: [],
    });
  }
  const roots: ThreadReply[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Sort siblings at every level by the chosen order.
  const cmp =
    sort === "new"
      ? (a: ThreadReply, b: ThreadReply) => b.createdAt.getTime() - a.createdAt.getTime()
      : sort === "old"
        ? (a: ThreadReply, b: ThreadReply) => a.createdAt.getTime() - b.createdAt.getTime()
        : (a: ThreadReply, b: ThreadReply) =>
            b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime();
  const sortTree = (list: ThreadReply[]) => {
    list.sort(cmp);
    list.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);

  return { post, postMyVote, replyCount: replies.length, roots };
}
