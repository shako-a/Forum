import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getUserProfile } from "@/lib/forum-data";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PostList } from "@/components/PostList";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = ["#d7263d", "#1f4e9c", "#2e8b57", "#b8860b", "#6a3d9c", "#0d8a8a"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/u/[forumName]">) {
  const { lang, forumName } = await params;
  if (!isLocale(lang)) notFound();

  const decodedName = decodeURIComponent(forumName);
  const [dict, user] = await Promise.all([getDictionary(lang), getCurrentUser()]);
  const headerUser = user ? { forumName: user.forumName, isDonor: user.isDonor } : null;

  const [allCategories, data] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getUserProfile(decodedName, user ? { id: user.id } : null),
  ]);
  if (!data) notFound();

  const { profile, posts } = data;
  const t = dict.profile;
  const isOwn = user?.id === profile.id;
  const showRealName = !profile.hideRealName;
  const roleLabel =
    profile.role === "ADMIN" ? dict.roles.admin : profile.role === "MODERATOR" ? dict.roles.moderator : null;
  const memberSince = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    new Date(profile.createdAt),
  );
  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <>
      <Header locale={lang} dict={dict} user={headerUser} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />

        <main className="feed">
          <div className="card card-pad profile-header">
            <span
              className="profile-avatar"
              style={{ background: avatarColor(profile.forumName) }}
              aria-hidden="true"
            >
              {profile.forumName.charAt(0).toUpperCase()}
            </span>
            <div className="profile-id">
              <h1 className="profile-name">
                {profile.forumName}
                {roleLabel && <span className="role-badge">{roleLabel}</span>}
                {profile.isDonor && <span className="donor-badge">💛 {t.donorBadge}</span>}
              </h1>
              {showRealName && (
                <p className="profile-realname">
                  {profile.firstName} {profile.lastName}
                </p>
              )}
              <p className="profile-meta">
                {location && (
                  <>
                    <span>📍 {location}</span>
                    <span className="sep">·</span>
                  </>
                )}
                <span>
                  {t.memberSince} {memberSince}
                </span>
                <span className="sep">·</span>
                <span>
                  {profile._count.posts} {t.posts}
                </span>
              </p>
            </div>
            {isOwn && (
              <Link href={`/${lang}/account`} className="btn btn-ghost">
                {t.editProfile}
              </Link>
            )}
          </div>

          <h2 className="profile-section-title">{t.postsBy.replace("{name}", profile.forumName)}</h2>
          <PostList
            locale={lang}
            dict={dict}
            posts={posts}
            canVote={!!user}
            loginHref={`/${lang}/login?next=/${lang}/u/${profile.forumName}`}
            emptyMessage={isOwn ? t.emptyOwn : t.empty}
          />
        </main>
      </div>
    </>
  );
}
