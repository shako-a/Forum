import "server-only";
import { db } from "@/lib/db";
import { pmToHtml, pmPlainText, pmFirstImage } from "@/lib/prosemirror";
import { canModerateCategory, canRevealAnonymous, getSiteSettings } from "@/lib/dal";
import { resolveAuthor, type DisplayAuthor } from "@/lib/anon";
import type { Locale } from "@/i18n/config";
import { Prisma, type Role } from "@/generated/prisma/client";

// Home feed sort tabs: hot = most-discussed, new = most recent, top = highest score.
export type FeedSort = "hot" | "new" | "top";

function feedOrderBy(
  sort: FeedSort,
): Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] {
  if (sort === "new") return { createdAt: "desc" };
  if (sort === "top") return [{ score: "desc" }, { lastActivity: "desc" }];
  return [{ replies: { _count: "desc" } }, { lastActivity: "desc" }]; // hot
}

// These loaders degrade gracefully: if the database isn't reachable yet
// (e.g. before the first `prisma migrate`), they return empty results so the
// UI still renders instead of crashing. Real errors are logged.

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

export async function getHomeData(viewer: { id: string } | null, sort: FeedSort = "hot") {
  const viewerIsAuthed = !!viewer;
  try {
    const [categories, posts, topAds, sidebarAds] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.post.findMany({
        where: { hidden: false },
        orderBy: feedOrderBy(sort),
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
    const postsWithVotes = await attachSaved(
      await attachMyVotes(visiblePosts, viewer?.id ?? null),
      viewer?.id ?? null,
    );

    // Popular Topics bar: admin-curated when any posts are pinned (featuredInBar),
    // otherwise the automatic top-by-score list. Total bar size (posts + ads) is
    // admin-configurable. Locked-category topics are marked `gated` for guests.
    const { popularBarSize } = await getSiteSettings();
    const featured = await db.post.findMany({
      where: { featuredInBar: true, hidden: false },
      orderBy: { score: "desc" },
      take: popularBarSize,
      include: { category: true, _count: { select: { replies: true } } },
    });
    const base =
      featured.length > 0
        ? featured
        : [...posts].sort((a, b) => b.score - a.score).slice(0, popularBarSize);
    const popular: PopularTopic[] = base.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      score: p.score,
      category: {
        slug: p.category.slug,
        nameEn: p.category.nameEn,
        nameKa: p.category.nameKa,
        locked: p.category.locked,
      },
      _count: { replies: p._count.replies },
      gated: !viewerIsAuthed && p.category.locked,
    }));

    return {
      categories,
      posts: postsWithVotes,
      popular,
      barSize: popularBarSize,
      topAds,
      sidebarAds,
      dbReady: true,
    };
  } catch (error) {
    console.error("getHomeData failed (is the database running & migrated?):", error);
    return {
      categories: [],
      posts: [],
      popular: [],
      barSize: 6,
      topAds: [],
      sidebarAds: [],
      dbReady: false,
    };
  }
}

// Standalone feed pages (Popular = highest score, New = most recent). Returns
// everything the page shell needs. Guests (shouldn't reach here while the forum
// is gated) only see unlocked categories.
export async function getFeedPage(viewer: { id: string } | null, sort: "popular" | "new") {
  try {
    const [categories, found, sidebarAds] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.post.findMany({
        where: { hidden: false, ...(viewer ? {} : { category: { locked: false } }) },
        orderBy:
          sort === "popular"
            ? [{ score: "desc" }, { replies: { _count: "desc" } }, { lastActivity: "desc" }]
            : { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { forumName: true } },
          category: true,
          _count: { select: { replies: true, votes: true } },
        },
      }),
      db.adCard.findMany({
        where: { active: true, placement: "SIDEBAR" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    const posts = await attachSaved(await attachMyVotes(found, viewer?.id ?? null), viewer?.id ?? null);
    return { categories, posts, sidebarAds };
  } catch (error) {
    console.error("getFeedPage failed:", error);
    return { categories: [], posts: [], sidebarAds: [] };
  }
}

// Forum-wide counters for the sidebar welcome card. "online" has no real-time
// presence system, so it's approximated as members active (posted or replied)
// in the last 24h — a real, honest figure. Degrades to zeros if the DB is down.
export async function getForumStats() {
  try {
    // "Online" = users who loaded a page in the last 5 minutes (see lastSeenAt
    // in getCurrentUser). Reflects actual presence, not just recent posters.
    const onlineSince = new Date(Date.now() - 5 * 60 * 1000);
    const [members, topics, online] = await Promise.all([
      db.user.count(),
      db.post.count(),
      db.user.count({ where: { lastSeenAt: { gte: onlineSince } } }),
    ]);
    return { members, online, topics };
  } catch (error) {
    console.error("getForumStats failed:", error);
    return { members: 0, online: 0, topics: 0 };
  }
}

// A card in the Popular Topics bar. `gated` = locked category shown to a guest:
// render the title as a teaser but route clicks to login instead of the post.
export type PopularTopic = {
  id: string;
  slug: string;
  title: string;
  score: number;
  category: { slug: string; nameEn: string; nameKa: string; locked: boolean };
  _count: { replies: number };
  gated: boolean;
};

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

// Attach whether the viewer has saved (bookmarked) each post.
async function attachSaved<T extends { id: string }>(
  posts: T[],
  userId: string | null,
): Promise<(T & { saved: boolean })[]> {
  if (!userId || posts.length === 0) return posts.map((p) => ({ ...p, saved: false }));
  const rows = await db.savedPost.findMany({
    where: { userId, postId: { in: posts.map((p) => p.id) } },
    select: { postId: true },
  });
  const set = new Set(rows.map((r) => r.postId));
  return posts.map((p) => ({ ...p, saved: set.has(p.id) }));
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
  const posts = await attachSaved(await attachMyVotes(found, viewer?.id ?? null), viewer?.id ?? null);
  return { category, posts, gated: false };
}

// A public user profile: the user's public-facing fields plus their visible
// posts (newest first). Returns null when no active user owns that forum name.
// Phone/email are deliberately never selected — they're hidden from other users.
export async function getUserProfile(forumName: string, viewer: { id: string } | null) {
  const profile = await db.user.findUnique({
    where: { forumName },
    select: {
      id: true,
      forumName: true,
      firstName: true,
      lastName: true,
      hideRealName: true,
      city: true,
      state: true,
      role: true,
      status: true,
      isDonor: true,
      isPro: true,
      isSupporter: true,
      createdAt: true,
      labels: {
        select: { nameEn: true, nameKa: true, color: true, background: true, font: true, bold: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!profile || profile.status !== "ACTIVE") return null;

  // Public posts = non-hidden, non-anonymous. The header shows this *actual*
  // total (including locked-category posts). The list, however, still hides
  // locked-category posts from guests — so the count can exceed the list, in
  // which case we flag it and the page shows a "members-only" note.
  const publicWhere = { authorId: profile.id, hidden: false, anonAlias: null };
  const listWhere = viewer ? publicWhere : { ...publicWhere, category: { locked: false } };

  const [found, postCount, listCount, anonCount] = await Promise.all([
    db.post.findMany({
      where: listWhere,
      orderBy: { lastActivity: "desc" },
      take: 50,
      include: POST_CARD_INCLUDE,
    }),
    db.post.count({ where: publicWhere }),
    db.post.count({ where: listWhere }),
    // Anonymous post count — for admins/owner only (kept out of the public total).
    db.post.count({ where: { authorId: profile.id, hidden: false, anonAlias: { not: null } } }),
  ]);

  const posts = await attachSaved(await attachMyVotes(found, viewer?.id ?? null), viewer?.id ?? null);
  const membersOnlyHidden = !viewer && listCount < postCount;

  return { profile, posts, postCount, anonCount, membersOnlyHidden };
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
  author: DisplayAuthor;
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
  viewer: { id: string; role: Role; isOwner: boolean; canRevealAnon?: boolean } | null,
  sort: ReplySort = "best",
  locale: Locale = "en",
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

  // Category-scoped: only a moderator of this post's category (or an admin) may
  // see hidden replies and wield moderation controls.
  const canModerate = viewer ? await canModerateCategory(viewer, post.categoryId) : false;
  // Owner (and staff if the owner allows) can see the real author behind anon.
  const canReveal = await canRevealAnonymous(viewer);
  const replies = await db.reply.findMany({
    where: { postId: post.id, ...(canModerate ? {} : { hidden: false }) },
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
      author: resolveAuthor(
        locale,
        { authorId: r.authorId, forumName: r.author.forumName, anonAlias: r.anonAlias },
        canReveal,
      ),
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

  return { post, canModerate, canReveal, postMyVote, replyCount: replies.length, roots };
}
