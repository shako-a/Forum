import "server-only";
import { db } from "@/lib/db";

// One-time (idempotent) migration of the packages that used to be hardcoded in
// src/lib/tiers.ts + the i18n dictionaries into admin-editable rows.
//
// Runs on demand from the admin page when the tables are still empty, so the
// deployed site fills itself in without a manual script. Uses upserts keyed on
// the stable `key`, so re-running never duplicates and never clobbers copy an
// admin has since edited (it only creates what is missing).

const FEATURES = [
  { key: "askAi", nameEn: "Ask AI — instant answers on jobs, housing and life abroad", nameKa: "Ask AI — მყისიერი პასუხები სამსახურზე, საცხოვრებელსა და უცხოეთში ცხოვრებაზე" },
  { key: "profileCustom", nameEn: "Profile customization", nameKa: "პროფილის მორგება" },
  { key: "feedCustom", nameEn: "Feed customization", nameKa: "ფიდის მორგება" },
  { key: "badgeSupporter", nameEn: "Supporter badge on your profile", nameKa: "მხარდამჭერის ნიშანი შენს პროფილზე" },
  { key: "badgeDonor", nameEn: "Donor badge on your profile", nameKa: "დონორის ნიშანი შენს პროფილზე" },
  { key: "badgePro", nameEn: "Professional badge on your profile", nameKa: "პროფესიონალის ნიშანი შენს პროფილზე" },
  { key: "business", nameEn: "Register a business in the directory", nameKa: "ბიზნესის რეგისტრაცია კატალოგში" },
  { key: "support", nameEn: "Help keep the community running", nameKa: "დაეხმარე საზოგადოების ფუნქციონირებას" },
];

const PACKAGES = [
  {
    key: "SUPPORTER",
    slug: "supporter",
    nameEn: "Supporter",
    nameKa: "მხარდამჭერი",
    blurbEn: "The small bracket — make the forum yours, without the AI extras.",
    blurbKa: "პატარა პაკეტი — მოირგე ფორუმი, AI-ს გარეშე.",
    pitchEn:
      "The entry bracket for people who want to chip in and personalize how the forum looks and reads. It covers profile and feed customization, and deliberately leaves out AI — if you want Ask AI, the Donor tier is the one you want.",
    pitchKa:
      "საწყისი პაკეტი მათთვის, ვისაც სურს წვლილი შეიტანოს და მოირგოს ფორუმის იერსახე. მოიცავს პროფილისა და ფიდის მორგებას და შეგნებულად არ შეიცავს AI-ს — თუ Ask AI გჭირდება, აირჩიე დონორის პაკეტი.",
    icon: "🤍",
    accent: "#27aab0",
    priceCents: 200,
    featured: false,
    sortOrder: 0,
    // included: listed with a tick; excluded: listed struck through.
    included: ["profileCustom", "feedCustom", "badgeSupporter", "support"],
    excluded: ["askAi"],
  },
  {
    key: "DONOR",
    slug: "donate",
    nameEn: "Donor",
    nameKa: "დონორი",
    blurbEn: "Back the community and unlock AI answers.",
    blurbKa: "დაუჭირე მხარი საზოგადოებას და გახსენი AI პასუხები.",
    pitchEn:
      "Donor keeps the lights on and unlocks Ask AI: instant answers about jobs, housing and life abroad. It includes everything in Supporter.",
    pitchKa:
      "დონორი ეხმარება ფორუმის ფუნქციონირებას და ხსნის Ask AI-ს: მყისიერი პასუხები სამსახურზე, საცხოვრებელსა და უცხოეთში ცხოვრებაზე. მოიცავს ყველაფერს მხარდამჭერის პაკეტიდან.",
    icon: "💛",
    accent: "#d7263d",
    priceCents: 2500,
    featured: true,
    sortOrder: 1,
    included: ["askAi", "profileCustom", "feedCustom", "badgeDonor", "support"],
    excluded: [],
  },
  {
    key: "PRO",
    slug: "pro",
    nameEn: "Professional",
    nameKa: "პროფესიონალი",
    blurbEn: "For businesses and people offering services.",
    blurbKa: "ბიზნესებისა და მომსახურების შემთავაზებლებისთვის.",
    pitchEn:
      "Professional is for anyone running a business or offering services to the community. It adds a business listing in the directory on top of everything Donor includes.",
    pitchKa:
      "პროფესიონალი განკუთვნილია მათთვის, ვინც ბიზნესს უძღვება ან მომსახურებას სთავაზობს საზოგადოებას. დონორის ყველა პრივილეგიას ემატება ბიზნესის განთავსება კატალოგში.",
    icon: "💼",
    accent: "#1f4e9c",
    priceCents: 7900,
    featured: false,
    sortOrder: 2,
    included: ["business", "askAi", "profileCustom", "feedCustom", "badgePro", "support"],
    excluded: [],
  },
];

export async function seedPaidPackages(): Promise<void> {
  const featureIds = new Map<string, string>();
  for (const [i, f] of FEATURES.entries()) {
    const row = await db.feature.upsert({
      where: { key: f.key },
      update: {}, // never overwrite copy an admin has edited
      create: { ...f, sortOrder: i },
    });
    featureIds.set(f.key, row.id);
  }

  for (const p of PACKAGES) {
    const { included, excluded, ...fields } = p;
    const pkg = await db.paidPackage.upsert({
      where: { key: p.key },
      update: {},
      create: { ...fields, isBuiltIn: true, isActive: true },
    });

    // Only wire perks for packages that have none yet, so an admin who has
    // curated the list does not get the defaults pushed back on top.
    const existing = await db.packageFeature.count({ where: { packageId: pkg.id } });
    if (existing > 0) continue;

    const rows = [
      ...included.map((k, i) => ({ key: k, included: true, sortOrder: i })),
      ...excluded.map((k, i) => ({ key: k, included: false, sortOrder: included.length + i })),
    ];
    await db.packageFeature.createMany({
      data: rows.flatMap((r) => {
        const featureId = featureIds.get(r.key);
        return featureId
          ? [{ packageId: pkg.id, featureId, included: r.included, sortOrder: r.sortOrder }]
          : [];
      }),
      skipDuplicates: true,
    });
  }
}

// True when nothing has been seeded yet — the admin page uses this to run the
// import once rather than on every visit.
export async function packagesNeedSeeding(): Promise<boolean> {
  return (await db.paidPackage.count()) === 0;
}
