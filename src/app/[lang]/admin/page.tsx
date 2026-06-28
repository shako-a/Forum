import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, getSiteSettings } from "@/lib/dal";
import { db } from "@/lib/db";

async function safeCount(fn: () => Promise<number>) {
  try {
    return await fn();
  } catch {
    return null; // DB not ready
  }
}

export default async function AdminDashboard({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // The dashboard is admin-only. Moderators (allowed into the panel by the
  // layout) land on their moderation section instead.
  const me = await getCurrentUser();
  if (me?.role !== "ADMIN") redirect(`/${lang}/admin/hidden`);

  const dict = await getDictionary(lang);
  const t = dict.admin;
  const settings = await getSiteSettings();

  const [users, categories, posts, hidden, ads, pinned] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.category.count()),
    safeCount(() => db.post.count()),
    safeCount(() => db.post.count({ where: { hidden: true } })),
    safeCount(() => db.adCard.count()),
    safeCount(() => db.post.count({ where: { featuredInBar: true, hidden: false } })),
  ]);

  // Posts currently shown in the Popular bar: pinned selection if curated,
  // otherwise the configured size (auto-filled by top score).
  const barPosts =
    (pinned ?? 0) > 0
      ? Math.min(pinned ?? 0, settings.popularBarSize)
      : Math.min(settings.popularBarSize, posts ?? 0);

  const base = `/${lang}/admin`;
  const stats = [
    { label: t.users, value: users, icon: "👥", href: `${base}/users` },
    { label: t.categories, value: categories, icon: "🗂", href: `${base}/categories` },
    { label: t.posts, value: posts, icon: "📝", href: `/${lang}` },
    { label: t.postManagement, value: barPosts, icon: "🔥", href: `${base}/popular` },
    { label: t.hiddenContent, value: hidden, icon: "🙈", href: `${base}/hidden` },
    { label: t.adCards, value: ads, icon: "📢", href: `${base}/ad-cards` },
  ];

  return (
    <div>
      <h1 className="admin-h1">{t.dashboard}</h1>
      <div className="admin-stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="admin-stat admin-stat-link">
            <span className="admin-stat-ico" aria-hidden="true">
              {s.icon}
            </span>
            <span className="admin-stat-value">{s.value ?? "—"}</span>
            <span className="admin-stat-label">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
