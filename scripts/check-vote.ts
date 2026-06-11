// Verifies the vote toggle math (pure) and the DB persistence (real transaction)
// against the live database. Run: npx tsx scripts/check-vote.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveVote, type Vote } from "../src/lib/vote-math";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}

// 2) DB round-trip — mirrors castVote("post", …) exactly.
async function castPost(userId: string, postId: string, clicked: 1 | -1) {
  return db.$transaction(async (tx) => {
    const existing = await tx.postVote.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true, value: true },
    });
    const { myVote, delta } = resolveVote((existing?.value ?? 0) as Vote, clicked);
    if (!existing) await tx.postVote.create({ data: { postId, userId, value: clicked } });
    else if (myVote === 0) await tx.postVote.delete({ where: { id: existing.id } });
    else await tx.postVote.update({ where: { id: existing.id }, data: { value: clicked } });
    const post = await tx.post.update({
      where: { id: postId },
      data: { score: { increment: delta } },
      select: { score: true },
    });
    return { score: post.score, myVote };
  });
}

async function main() {
  // 1) Pure toggle math — every transition.
  eq("none + up", resolveVote(0, 1), { myVote: 1, delta: 1 });
  eq("none + down", resolveVote(0, -1), { myVote: -1, delta: -1 });
  eq("up + up → toggle off", resolveVote(1, 1), { myVote: 0, delta: -1 });
  eq("down + down → toggle off", resolveVote(-1, -1), { myVote: 0, delta: 1 });
  eq("up + down → switch", resolveVote(1, -1), { myVote: -1, delta: -2 });
  eq("down + up → switch", resolveVote(-1, 1), { myVote: 1, delta: 2 });

  const post = await db.post.findFirst({
    where: { slug: "georgian-food-spots-by-city" },
    select: { id: true },
  });
  const user = await db.user.findUnique({ where: { email: "admin@forum.local" }, select: { id: true } });

  if (!post || !user) {
    console.log("Missing fixtures (run npm run db:seed). Skipping DB checks.");
    return;
  }

  // Clean slate: drop any existing admin vote, recompute score from remaining votes.
  const recompute = async () => {
    await db.postVote.deleteMany({ where: { postId: post.id, userId: user.id } });
    const agg = await db.postVote.aggregate({ where: { postId: post.id }, _sum: { value: true } });
    await db.post.update({ where: { id: post.id }, data: { score: agg._sum.value ?? 0 } });
    const p = await db.post.findUnique({ where: { id: post.id }, select: { score: true } });
    return p!.score;
  };
  const start = await recompute();

  let r = await castPost(user.id, post.id, 1);
  eq("DB upvote → score +1", r.score, start + 1);
  eq("DB upvote → myVote 1", r.myVote, 1);

  r = await castPost(user.id, post.id, 1);
  eq("DB upvote again → toggled off, score restored", r.score, start);
  eq("DB toggle off → myVote 0", r.myVote, 0);

  r = await castPost(user.id, post.id, -1);
  eq("DB downvote → score -1", r.score, start - 1);

  r = await castPost(user.id, post.id, 1);
  eq("DB switch down→up → net +1", r.score, start + 1);
  eq("DB switch → myVote 1", r.myVote, 1);

  await recompute(); // cleanup: remove admin vote, restore original score
}

main()
  .then(async () => {
    console.log(`\n${pass}/${pass + fail} checks passed.`);
    await db.$disconnect();
    process.exit(fail ? 1 : 0);
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
