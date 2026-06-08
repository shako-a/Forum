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
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
