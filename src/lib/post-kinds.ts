import type { PostKind } from "@/generated/prisma/client";

// Which kinds of Post belong on the forum's own surfaces.
//
// A JOB post is the Q&A thread attached to a job listing. Making it a real
// Post is what lets questions reuse the entire reply system, but it is not a
// forum topic: it has no body of its own and lives on the job page. So every
// feed, count, search and curation query filters on this list rather than
// taking "every Post".
//
// Anything added to PostKind must be considered here — that is the point of
// having one named constant instead of repeating `kind: "DISCUSSION"`.
export const FEED_KINDS: PostKind[] = ["DISCUSSION", "EVENT"];

/** Spread into a Prisma `where` to exclude threads that aren't forum topics. */
export const FEED_KIND_FILTER = { kind: { in: FEED_KINDS } } as const;
