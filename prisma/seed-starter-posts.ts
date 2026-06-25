import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPgAdapter } from "../src/lib/pg-adapter";
import { textToPmDoc } from "../src/lib/prosemirror";

// One-off, idempotent starter content so a fresh forum (e.g. an in-house test)
// lands on a lively page instead of an empty feed. Re-running skips existing
// slugs. Posts are authored by the first ADMIN. Safe to delete after testing.

type Starter = { slug: string; cat: string; title: string; body: string; replies?: string[] };

const POSTS: Starter[] = [
  {
    slug: "welcome-to-geoglobally",
    cat: "discussions",
    title: "Welcome to GeoGlobally 👋 — introduce yourself!",
    body: "This is our community for Georgians around the world. Tell us where you're based, what you do, and what brought you here. Looking forward to building this together!",
    replies: [
      "Gamarjoba from Berlin! Software engineer, moved here two years ago. Happy to help newcomers settle in.",
      "Hello from Toronto 🇬🇪🇨🇦 — great to see a space like this.",
    ],
  },
  {
    slug: "georgian-food-abroad",
    cat: "discussions",
    title: "Where to find real Georgian food abroad? 🥘",
    body: "Share the best spots for khachapuri, khinkali and proper wine in your city. I'll start — there's a wonderful family-run place in Brooklyn. Your turn!",
    replies: ["There's a great supra spot in London near Edgware Road — highly recommend the adjaruli."],
  },
  {
    slug: "newcomer-job-tips",
    cat: "employment",
    title: "Tips for finding your first job as a newcomer",
    body: "A few things that helped me: get your documents translated early, lean on community groups for referrals, and don't undersell your experience. What worked for you?",
  },
  {
    slug: "first-apartment-abroad",
    cat: "housing",
    title: "Renting your first apartment abroad — what to watch for",
    body: "Deposits, contracts, neighborhoods, and the paperwork landlords ask for. Let's compile practical advice for people who've just arrived.",
  },
  {
    slug: "visa-residency-questions",
    cat: "legal",
    title: "Visa & residency: ask your questions here",
    body: "Drop your immigration, visa, and residency questions in this thread and the community will try to point you in the right direction.",
  },
];

async function main() {
  const db = new PrismaClient({ adapter: createPgAdapter() });
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) {
    console.error("No ADMIN user found — seed an admin first.");
    process.exit(1);
  }
  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id])) as Record<string, string>;

  let created = 0;
  for (const p of POSTS) {
    if (await db.post.findUnique({ where: { slug: p.slug }, select: { id: true } })) {
      console.log(`skip (exists): ${p.slug}`);
      continue;
    }
    const categoryId = catId[p.cat];
    if (!categoryId) {
      console.log(`skip (no category "${p.cat}"): ${p.slug}`);
      continue;
    }
    const post = await db.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        body: textToPmDoc(p.body) as never,
        categoryId,
        authorId: admin.id,
        lastActivity: new Date(),
      },
      select: { id: true },
    });
    for (const r of p.replies ?? []) {
      await db.reply.create({
        data: { postId: post.id, authorId: admin.id, body: textToPmDoc(r) as never },
      });
    }
    created++;
    console.log(`created: ${p.slug}${p.replies ? ` (+${p.replies.length} replies)` : ""}`);
  }
  console.log(`Done. ${created} new starter post(s).`);
  await db.$disconnect();
}

main();
