import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Categories from the spec. `locked` categories show their name to guests but
// gate content behind login.
const CATEGORIES = [
  { slug: "discussions", nameEn: "Discussions", nameKa: "დისკუსიები", locked: false },
  { slug: "employment", nameEn: "Employment", nameKa: "დასაქმება", locked: true },
  { slug: "housing", nameEn: "Housing", nameKa: "საცხოვრებელი", locked: true },
  { slug: "automobile", nameEn: "Automobile & Carriers", nameKa: "ავტომობილები და გადაზიდვები", locked: true },
  { slug: "legal", nameEn: "Legal", nameKa: "იურიდიული", locked: true },
  { slug: "marketplace", nameEn: "Marketplace", nameKa: "მარკეტი", locked: true },
  { slug: "assistance", nameEn: "Assistance and Charity", nameKa: "დახმარება და ქველმოქმედება", locked: false },
  { slug: "services", nameEn: "Services", nameKa: "სერვისები", locked: true },
  { slug: "networking", nameEn: "Networking", nameKa: "ნეთვორქინგი", locked: true },
];

// TOP_PANEL advertisement cards shown in the home horizontal panel. Stable ids
// so re-seeding upserts in place (never duplicates) and every machine renders
// the same panel. Edit/recolor/reorder these later via /admin/ad-cards.
const AD_CARDS = [
  {
    id: "seed_ad_top_1",
    titleEn: "Discover Georgian Wine Country",
    titleKa: "აღმოაჩინე ქართული ღვინის მხარე",
    imageUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=70",
    linkUrl: "https://example.com/wine",
    titleColor: "#ffffff",
  },
  {
    id: "seed_ad_top_2",
    titleEn: "Tbilisi Tech Meetup 2026",
    titleKa: "თბილისის ტექ შეხვედრა 2026",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=70",
    linkUrl: "https://example.com/meetup",
    titleColor: "#ffffff",
  },
  {
    id: "seed_ad_top_3",
    titleEn: "Learn Georgian Online",
    titleKa: "ისწავლე ქართული ონლაინ",
    imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&q=70",
    linkUrl: "https://example.com/learn",
    titleColor: "#ffffff",
  },
];

async function main() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await db.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameKa: c.nameKa, locked: c.locked, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  for (let i = 0; i < AD_CARDS.length; i++) {
    const a = AD_CARDS[i];
    await db.adCard.upsert({
      where: { id: a.id },
      update: { ...a, placement: "TOP_PANEL", active: true, sortOrder: i + 1 },
      create: { ...a, placement: "TOP_PANEL", active: true, sortOrder: i + 1 },
    });
  }
  console.log(`Seeded ${AD_CARDS.length} TOP_PANEL ad cards.`);

  // Optional bootstrap admin via env vars.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
        forumName: "admin",
        firstName: "Site",
        lastName: "Admin",
        phone: "",
        state: "",
      },
    });
    console.log(`Ensured admin user ${adminEmail}.`);
  } else {
    console.log("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create an admin user.");
  }

  await seedDemoContent();
}

// Demo users + posts so the feed is populated for local development.
// Only runs once (when there are no posts yet) so re-seeding is safe.
async function seedDemoContent() {
  if ((await db.post.count()) > 0) {
    console.log("Posts already exist — skipping demo content.");
    return;
  }

  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id])) as Record<string, string>;

  const demoHash = await bcrypt.hash("demo1234", 10);
  const demoUsers = [
    { forumName: "Nino_B", firstName: "Nino", lastName: "B.", email: "nino@demo.local", phone: "+995", state: "Tbilisi", city: "Tbilisi" },
    { forumName: "Levani_NJ", firstName: "Levani", lastName: "G.", email: "levani@demo.local", phone: "+1", state: "New Jersey", city: "Newark" },
    { forumName: "GiorgiK", firstName: "Giorgi", lastName: "K.", email: "giorgi@demo.local", phone: "+1", state: "Pennsylvania", city: "Philadelphia" },
  ];
  const users: Record<string, string> = {};
  for (const u of demoUsers) {
    const created = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: demoHash, role: "USER" },
      select: { id: true, forumName: true },
    });
    users[created.forumName] = created.id;
  }

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  const posts = [
    {
      slug: "newcomer-megathread-2026",
      category: "legal",
      author: "GiorgiK",
      title: "2026 Newcomer Megathread: SSN, driver's license, bank account — step by step",
      text: "Community-maintained guide for the first 90 days. Documents to prepare before you move, DMV rules by region, and which banks open accounts without credit history.",
      hours: 48,
    },
    {
      slug: "cdl-dispatch-companies-2026",
      category: "automobile",
      author: "Levani_NJ",
      title: "CDL-A owner-operators: which dispatch companies actually pay on time in 2026?",
      text: "Been running dry van for 2 years, switching dispatchers. Looking for real experiences with Georgian-owned dispatch services — rates, hidden fees, detention pay.",
      hours: 3,
    },
    {
      slug: "room-for-rent-bensonhurst",
      category: "housing",
      author: "Nino_B",
      title: "ოთახი ქირავდება — კომუნალური ჩათვლით, მეტროსთან ახლოს",
      text: "$950 თვეში, ავეჯით. მეტროდან 5 წუთი. მშვიდი მეზობლები, შემოდინება მარტიდან.",
      hours: 5,
    },
    {
      slug: "georgian-food-spots-by-city",
      category: "discussions",
      author: "Nino_B",
      title: "Found a bakery that makes real shoti puri — thread of Georgian food spots by city 🥖",
      text: "Drop your city and the closest place for khachapuri, churchkhela, or proper bread. I'll compile everything into a map this weekend.",
      hours: 9,
    },
    {
      slug: "hiring-hvac-helper",
      category: "employment",
      author: "GiorgiK",
      title: "Hiring: HVAC helper, no experience needed — will train, $22/hr to start",
      text: "Small Georgian-owned company. Basic English is enough, we work in pairs. Legal work authorization required. DM or comment below.",
      hours: 12,
    },
  ];

  for (const p of posts) {
    if (!catId[p.category]) continue;
    const post = await db.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        body: { version: 1, text: p.text },
        categoryId: catId[p.category],
        authorId: users[p.author],
        lastActivity: hoursAgo(p.hours),
        createdAt: hoursAgo(p.hours),
      },
      select: { id: true },
    });

    // A couple of votes + replies so counts are non-zero.
    const voterIds = Object.values(users);
    for (const uid of voterIds) {
      await db.postVote.create({ data: { postId: post.id, userId: uid, value: 1 } });
    }
    await db.reply.create({
      data: {
        postId: post.id,
        authorId: voterIds[0],
        body: { version: 1, text: "Thanks for sharing — following this." },
      },
    });
  }
  console.log(`Seeded ${posts.length} demo posts with ${demoUsers.length} demo users.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
