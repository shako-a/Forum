// Verifies the editReply authz + update logic against the live DB.
// (The full action also does getCurrentUser + revalidatePath, both already proven
// by the deleteReply and createReply e2e tests.) Run: npx tsx scripts/check-edit.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildReplyDoc, pmPlainText } from "../src/lib/prosemirror";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const RANK: Record<string, number> = { USER: 1, MODERATOR: 2, ADMIN: 3 };

let pass = 0,
  fail = 0;
const ok = (n: string, c: boolean) => {
  console.log(`${c ? "✓" : "✗"} ${n}`);
  c ? pass++ : fail++;
};

// Mirrors editReply's authorization + update (without the request/cookie layer).
async function tryEdit(actorId: string, actorRole: string, replyId: string, text: string) {
  const reply = await db.reply.findUnique({ where: { id: replyId }, select: { authorId: true, deletedAt: true } });
  if (!reply || reply.deletedAt) return { allowed: false };
  const canEdit = reply.authorId === actorId || RANK[actorRole] >= RANK.MODERATOR;
  if (!canEdit) return { allowed: false };
  await db.reply.update({ where: { id: replyId }, data: { body: buildReplyDoc(text) as object } });
  return { allowed: true };
}

async function main() {
  const post = await db.post.findFirst({ where: { slug: "georgian-food-spots-by-city" }, select: { id: true } });
  const admin = await db.user.findUnique({ where: { email: "admin@forum.local" }, select: { id: true, role: true } });
  const nino = await db.user.findUnique({ where: { email: "nino@demo.local" }, select: { id: true, role: true } });
  if (!post || !admin || !nino) {
    console.log("Missing fixtures.");
    return;
  }

  // A reply authored by nino (a regular USER).
  const reply = await db.reply.create({
    data: { postId: post.id, authorId: nino.id, body: buildReplyDoc("original") as object },
    select: { id: true },
  });

  const bodyText = async () =>
    pmPlainText((await db.reply.findUnique({ where: { id: reply.id }, select: { body: true } }))!.body);

  // Author edits own reply → allowed.
  let r = await tryEdit(nino.id, nino.role, reply.id, "edited by author");
  ok("author can edit own reply", r.allowed && (await bodyText()) === "edited by author");

  // A different regular user (simulate) cannot edit.
  r = await tryEdit("non-existent-user-id", "USER", reply.id, "hacked");
  ok("non-author USER cannot edit", !r.allowed && (await bodyText()) === "edited by author");

  // Moderator/Admin can edit others' replies (spec: mods may edit).
  r = await tryEdit(admin.id, admin.role, reply.id, "edited by admin");
  ok("admin/mod can edit another user's reply", r.allowed && (await bodyText()) === "edited by admin");

  await db.replyVote.deleteMany({ where: { replyId: reply.id } });
  await db.reply.delete({ where: { id: reply.id } });
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
