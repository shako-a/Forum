import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, getSiteSettings } from "@/lib/dal";
import { db } from "@/lib/db";
import { countVisitors, countVisitorsToday, countVisitsAllTime, getVisitorBaseline, VISITOR_WINDOW_DAYS } from "@/lib/visitors";
import { VisitorBaselineForm } from "@/components/admin/VisitorBaselineForm";

// Activity-tile windows, outside the component so the render body stays pure.
function activityWindows() {
  const now = new Date();
  return {
    dayAgo: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    weekAgo: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  };
}

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

  const { dayAgo, weekAgo } = activityWindows();
  const [users, categories, posts, hidden, ads, pinned, online, visitors30, visitorsToday, visitsAllTime, baseline, events24h, warnings7d] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.category.count()),
    safeCount(() => db.post.count()),
    safeCount(() => db.post.count({ where: { hidden: true } })),
    safeCount(() => db.adCard.count()),
    safeCount(() => db.post.count({ where: { featuredInBar: true, hidden: false } })),
    safeCount(() => db.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } })),
    safeCount(() => countVisitors(VISITOR_WINDOW_DAYS, true)),
    safeCount(() => countVisitorsToday()),
    safeCount(() => countVisitsAllTime()),
    safeCount(() => getVisitorBaseline()),
    safeCount(() => db.auditLog.count({ where: { at: { gte: dayAgo } } })),
    safeCount(() => db.auditLog.count({ where: { at: { gte: weekAgo }, OR: [{ severity: "warning" }, { outcome: "denied" }] } })),
  ]);

  // Posts currently shown in the Popular bar: pinned selection if curated,
  // otherwise the configured size (auto-filled by top score).
  const barPosts =
    (pinned ?? 0) > 0
      ? Math.min(pinned ?? 0, settings.popularBarSize)
      : Math.min(settings.popularBarSize, posts ?? 0);

  const base = `/${lang}/admin`;
  const stats = [
    { label: t.onlineNow, value: online, icon: "🟢", href: `${base}/users` },
    { label: t.visitorsToday, value: visitorsToday, icon: "👣", href: `${base}` },
    { label: t.visitorsWindow.replace("{n}", String(VISITOR_WINDOW_DAYS)), value: visitors30, icon: "📈", href: `${base}` },
    { label: t.visitsAllTime, value: visitsAllTime, icon: "🌍", href: `${base}` },
    { label: t.users, value: users, icon: "👥", href: `${base}/users` },
    { label: t.categories, value: categories, icon: "🗂", href: `${base}/categories` },
    { label: t.posts, value: posts, icon: "📝", href: `/${lang}` },
    { label: t.postManagement, value: barPosts, icon: "🔥", href: `${base}/popular` },
    { label: t.hiddenContent, value: hidden, icon: "🙈", href: `${base}/hidden` },
    { label: t.adCards, value: ads, icon: "📢", href: `${base}/ad-cards` },
    { label: t.activity.dashTile24h, value: events24h, icon: "🧾", href: `${base}/activity` },
    { label: t.activity.dashTileWarn, value: warnings7d, icon: "⚠️", href: `${base}/activity?quick=security` },
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
      <VisitorBaselineForm
        dict={dict}
        baseline={baseline ?? 0}
        recorded={(visitsAllTime ?? 0) - (baseline ?? 0)}
      />
    </div>
  );
}
