import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPgAdapter } from "../src/lib/pg-adapter";
import { textToPmDoc } from "../src/lib/prosemirror";

// Idempotent Georgian starter content (re-running skips existing slugs).
// Authored by the first ADMIN. Safe to delete after testing.

type Starter = { slug: string; cat: string; title: string; body: string; replies?: string[] };

const POSTS: Starter[] = [
  {
    slug: "ka-welcome",
    cat: "discussions",
    title: "მოგესალმებით GeoGlobally-ზე 👋 — გაგვაცანით თავი",
    body: "ეს არის ქართველების საზოგადოება მთელ მსოფლიოში. დაგვიწერეთ სად ცხოვრობთ, რას საქმიანობთ და რა მოგიყვანათ აქ. მოდი, ერთად ავაშენოთ ეს სივრცე!",
    replies: [
      "გამარჯობა ბერლინიდან! პროგრამისტი ვარ, ორი წელია აქ ვცხოვრობ. სიამოვნებით დავეხმარები ახლად ჩამოსულებს.",
      "სალამი ტორონტოდან 🇬🇪🇨🇦 — მაგარია, რომ ასეთი სივრცე გაჩნდა.",
    ],
  },
  {
    slug: "ka-food",
    cat: "discussions",
    title: "სად ვიპოვოთ ნამდვილი ქართული საჭმელი? 🥘",
    body: "გაგვიზიარეთ საუკეთესო ადგილები ხაჭაპურის, ხინკლისა და კარგი ღვინისთვის თქვენს ქალაქში. მე დავიწყებ — ბრუკლინში არის შესანიშნავი ოჯახური რესტორანი. თქვენი ჯერია!",
    replies: ["ლონდონში, Edgware Road-თან მაგარი ადგილია — აჭარული აუცილებლად სცადეთ."],
  },
  {
    slug: "ka-jobs",
    cat: "employment",
    title: "სამსახურის ძებნის რჩევები ახალბედებისთვის",
    body: "რამდენიმე რამ, რაც დამეხმარა: დოკუმენტების თარგმნა ადრევე, საზოგადოების ჯგუფებში რეკომენდაციების ძებნა და საკუთარი გამოცდილების სათანადო შეფასება. თქვენ რა გამოგადგათ?",
  },
  {
    slug: "ka-housing",
    cat: "housing",
    title: "პირველი ბინის ქირაობა — რას მივაქციოთ ყურადღება",
    body: "დეპოზიტი, კონტრაქტი, უბნის შერჩევა და დოკუმენტები, რასაც მესაკუთრეები ითხოვენ. მოდი, შევკრიბოთ პრაქტიკული რჩევები ახლად ჩამოსულებისთვის.",
  },
  {
    slug: "ka-visa",
    cat: "legal",
    title: "ვიზა და ბინადრობა: დასვით კითხვები აქ",
    body: "დაწერეთ თქვენი კითხვები ვიზის, იმიგრაციისა და ბინადრობის შესახებ და საზოგადოება შეეცდება, სწორი მიმართულება მოგცეთ.",
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
  console.log(`Done. ${created} new Georgian post(s).`);
  await db.$disconnect();
}

main();
