import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole, getSiteSettings } from "@/lib/dal";
import { db } from "@/lib/db";
import { PopularAdmin, type BarPost } from "@/components/admin/PopularAdmin";

export const dynamic = "force-dynamic";

const POST_PICK = {
  id: true,
  slug: true,
  title: true,
  score: true,
  featuredInBar: true,
  category: { select: { slug: true, nameEn: true, nameKa: true } },
  _count: { select: { replies: true } },
} as const;

type Row = {
  id: string;
  slug: string;
  title: string;
  score: number;
  featuredInBar: boolean;
  category: { slug: string; nameEn: string; nameKa: string };
  _count: { replies: number };
};

const toBarPost = (p: Row): BarPost => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  category: p.category,
  score: p.score,
  comments: p._count.replies,
  featured: p.featuredInBar,
});

export default async function AdminPopularPage({ params }: PageProps<"/[lang]/admin/popular">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);

  const { popularBarSize } = await getSiteSettings();
  const [mostVoted, mostCommented, pinnedCount] = await Promise.all([
    db.post.findMany({ where: { hidden: false }, orderBy: { score: "desc" }, take: popularBarSize, select: POST_PICK }),
    db.post.findMany({
      where: { hidden: false },
      orderBy: { replies: { _count: "desc" } },
      take: popularBarSize,
      select: POST_PICK,
    }),
    db.post.count({ where: { featuredInBar: true, hidden: false } }),
  ]);

  return (
    <PopularAdmin
      locale={lang}
      dict={dict}
      barSize={popularBarSize}
      pinnedCount={pinnedCount}
      mostVoted={(mostVoted as Row[]).map(toBarPost)}
      mostCommented={(mostCommented as Row[]).map(toBarPost)}
    />
  );
}
