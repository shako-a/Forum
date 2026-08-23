import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { getBusinessProfile, avgRating } from "@/lib/business-data";
import { getBusinessPosts } from "@/lib/forum-data";
import { canManageBusiness } from "@/lib/business-manage";
import { businessCategoryLabel, businessCategoryIcon } from "@/lib/business-categories";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PostList } from "@/components/PostList";
import { Stars } from "@/components/business/Stars";
import { ReviewForm } from "@/components/business/ReviewForm";
import { ReviewReply } from "@/components/business/ReviewReply";

export const dynamic = "force-dynamic";

export default async function BusinessProfilePage({ params }: PageProps<"/[lang]/business/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user, allCategories, biz] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getBusinessProfile(slug),
  ]);
  if (!biz) notFound();
  const t = dict.business;

  const isOwner = !!user && user.id === biz.owner.id;
  // Owner, a delegated manager, or an admin can manage this business.
  const canManage = user ? await canManageBusiness(user.id, biz.id, user.role === "ADMIN") : false;
  const businessPosts = await getBusinessPosts(biz.id, user?.id ?? null);
  const myReview = user ? biz.reviews.find((r) => r.authorId === user.id) : undefined;
  const location = [biz.city, stateLabel(biz.state, lang)].filter(Boolean).join(", ");
  const website = biz.website;

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <div className="shell">
        <LeftSidebar locale={lang} dict={dict} categories={allCategories} />
        <main className="feed">
          {/* Header card */}
          <div className="card card-pad biz-profile-head">
            <div className="biz-profile-logo" aria-hidden="true">
              {biz.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={biz.logoUrl} alt="" />
              ) : (
                <span>{businessCategoryIcon(biz.category)}</span>
              )}
            </div>
            <div className="biz-profile-id">
              <h1 className="biz-profile-name">
                {biz.name}
                {biz.verified && <span className="biz-verified" title={t.verified}>✓</span>}
                {biz.featured && <span className="biz-featured">★ {t.featured}</span>}
              </h1>
              {biz.tagline && <p className="biz-profile-tagline">{biz.tagline}</p>}
              <div className="biz-card-meta">
                <span>{businessCategoryIcon(biz.category)} {businessCategoryLabel(biz.category, lang)}</span>
                {location && <><span className="sep">·</span><span>{location}</span></>}
              </div>
              <Stars value={avgRating(biz)} count={biz.ratingCount} />
            </div>
            {canManage && (
              <Link href={`/${lang}/business/${biz.slug}/manage`} className="btn btn-ghost biz-manage">
                {t.manage}
              </Link>
            )}
          </div>

          {/* Contact */}
          {(website || biz.email || biz.phone) && (
            <div className="card card-pad biz-contact">
              {website && <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="biz-contact-item">🌐 {website.replace(/^https?:\/\//, "")}</a>}
              {biz.email && <a href={`mailto:${biz.email}`} className="biz-contact-item">✉ {biz.email}</a>}
              {biz.phone && <a href={`tel:${biz.phone}`} className="biz-contact-item">📞 {biz.phone}</a>}
            </div>
          )}

          {/* Description */}
          {biz.description && (
            <div className="card card-pad biz-section">
              <p className="biz-description">{biz.description}</p>
            </div>
          )}

          {/* Posts authored by the business */}
          {businessPosts.length > 0 && (
            <div className="biz-section">
              <h2 className="biz-section-title" style={{ padding: "0 4px 8px" }}>📝 {t.posts}</h2>
              <PostList
                locale={lang}
                dict={dict}
                posts={businessPosts}
                canVote={!!user}
                loginHref={`/${lang}/login?next=/${lang}/business/${biz.slug}`}
                canDelete={user?.role === "ADMIN"}
              />
            </div>
          )}

          {/* Jobs */}
          {biz.jobs.length > 0 && (
            <div className="card card-pad biz-section">
              <h2 className="biz-section-title">💼 {t.openJobs}</h2>
              {biz.jobs.map((j) => (
                <div key={j.id} className="biz-job">
                  <h3 className="biz-job-title">{j.title}</h3>
                  <p className="biz-job-desc">{j.description}</p>
                  {(j.city || j.state) && (
                    <p className="biz-job-loc">📍 {[j.city, j.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          <div className="card card-pad biz-section">
            <h2 className="biz-section-title">⭐ {t.reviews} ({biz.ratingCount})</h2>

            {user && !isOwner && (
              <div className="biz-review-mine">
                <p className="biz-review-prompt">{myReview ? t.yourReview : t.leaveReview}</p>
                <ReviewForm
                  locale={lang}
                  dict={dict}
                  businessId={biz.id}
                  initialRating={myReview?.rating ?? 0}
                  initialBody={myReview?.body ?? ""}
                />
              </div>
            )}
            {!user && <p className="biz-review-login"><Link href={`/${lang}/login?next=/${lang}/business/${biz.slug}`}>{t.loginToReview}</Link></p>}

            {biz.reviews.length === 0 ? (
              <p className="biz-empty">{t.noReviews}</p>
            ) : (
              <ul className="biz-review-list">
                {biz.reviews.map((r) => (
                  <li key={r.id} className="biz-review">
                    <div className="biz-review-head">
                      <Link href={`/${lang}/u/${encodeURIComponent(r.author.forumName)}`} className="biz-review-author">
                        {r.author.forumName}
                      </Link>
                      <Stars value={r.rating} />
                      <span className="biz-review-time">{timeAgo(new Date(r.createdAt), lang)}</span>
                    </div>
                    {r.body && <p className="biz-review-body">{r.body}</p>}

                    {/* The business's public response */}
                    {r.ownerReply && (
                      <div className="biz-review-owner">
                        <span className="biz-review-owner-label">🏢 {t.businessReplied}</span>
                        <p className="biz-review-owner-body">{r.ownerReply}</p>
                      </div>
                    )}
                    {canManage && (
                      <ReviewReply locale={lang} reviewId={r.id} existing={r.ownerReply} dict={dict} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
