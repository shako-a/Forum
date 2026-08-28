import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/slug";

// The Q&A thread behind a job listing.
//
// Questions are Replies on a companion Post (kind = JOB) rather than a new
// model, which is what lets them reuse threading, votes, anonymous authors,
// moderation, reports, edit/delete and notifications without touching any of
// that code. The thread has no body of its own — the job page renders the
// listing above it — and lib/post-kinds.ts keeps it out of the feed, search,
// the popular bar and the forum counts.
//
// It's created the first time someone opens the job page rather than when the
// job is posted, so listings that predate this feature get one too and there's
// only one code path to reason about.

/** Where job threads are filed, so the right moderators can act on them. */
const PREFERRED_CATEGORY = "employment";

const EMPTY_DOC = { type: "doc", content: [] };

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "job";
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const exists = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type JobDiscussion = { id: string; slug: string };

/**
 * The job's thread, creating it if this is the first visit. Returns null only
 * when the job is gone or has no owner to attribute the thread to.
 */
export async function ensureJobDiscussion(jobId: string): Promise<JobDiscussion | null> {
  const job = await db.jobPosting.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      posterId: true,
      businessId: true,
      discussion: { select: { id: true, slug: true } },
      business: { select: { ownerId: true } },
    },
  });
  if (!job) return null;
  if (job.discussion) return job.discussion;

  // A business listing is authored by the business owner and attributed to the
  // business, exactly as if they had posted while acting as it.
  const authorId = job.posterId ?? job.business?.ownerId;
  if (!authorId) return null;

  const category =
    (await db.category.findUnique({ where: { slug: PREFERRED_CATEGORY }, select: { id: true } })) ??
    (await db.category.findFirst({ orderBy: { sortOrder: "asc" }, select: { id: true } }));
  if (!category) return null;

  const post = await db.post.create({
    data: {
      kind: "JOB",
      slug: await uniqueSlug(job.title),
      title: job.title,
      body: EMPTY_DOC as unknown as Prisma.InputJsonValue,
      categoryId: category.id,
      authorId,
      authorBusinessId: job.businessId,
      lastActivity: job.createdAt,
    },
    select: { id: true, slug: true },
  });

  // Two people can open the page at the same moment. Claim the slot only if
  // it's still empty; the loser drops its thread and uses the winner's, so a
  // job can never end up with two.
  const claimed = await db.jobPosting.updateMany({
    where: { id: jobId, discussionId: null },
    data: { discussionId: post.id },
  });
  if (claimed.count === 0) {
    await db.post.delete({ where: { id: post.id } }).catch(() => {});
    const again = await db.jobPosting.findUnique({
      where: { id: jobId },
      select: { discussion: { select: { id: true, slug: true } } },
    });
    return again?.discussion ?? null;
  }
  return post;
}

/** Question counts for the board, so a card can invite the click. */
export async function jobQuestionCounts(jobIds: string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();
  const jobs = await db.jobPosting.findMany({
    where: { id: { in: jobIds }, discussionId: { not: null } },
    select: { id: true, discussion: { select: { _count: { select: { replies: true } } } } },
  });
  return new Map(jobs.map((j) => [j.id, j.discussion?._count.replies ?? 0]));
}
