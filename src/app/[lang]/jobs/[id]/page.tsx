import Link from "@/components/Link";
import { RichText } from "@/components/RichText";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { toHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import { localeHref } from "@/lib/locale-url";
import { getPostView } from "@/lib/forum-data";
import { ensureJobDiscussion } from "@/lib/job-discussion";
import { businessCategoryIcon, businessCategoryLabel } from "@/lib/business-categories";
import { jobTypeLabel } from "@/lib/jobs";
import { stateLabel } from "@/lib/us-states";
import { timeAgo } from "@/lib/format";
import { aliasOptions } from "@/lib/anon";
import { getActingBusiness } from "@/lib/acting-as";
import { mapsDirectionsUrl } from "@/lib/maps";
import { socialLinks, whatsappUrl } from "@/lib/business-social";
import { getFeaturedCards, getSimilarJobs } from "@/lib/featured";
import type { ContactTarget } from "@/lib/modules";
import { ReplyComposer } from "@/components/ReplyComposer";
import { ReplyThread } from "@/components/ReplyThread";
import { ReplySort, type ReplySortKey } from "@/components/ReplySort";
import { ShareMenu } from "@/components/ShareMenu";
import { ListingPage } from "@/components/listing/ListingPage";
import { ListingHero } from "@/components/listing/ListingHero";
import { ListingActions, type ListingAction } from "@/components/listing/ListingActions";
import { Section } from "@/components/listing/Section";
import { SpecTable } from "@/components/listing/SpecTable";
import { ContactCard } from "@/components/listing/ContactCard";
import { SocialCard } from "@/components/listing/SocialCard";
import { LocationCard } from "@/components/listing/LocationCard";
import { MessageForm } from "@/components/listing/MessageForm";
import { SimilarGrid } from "@/components/listing/SimilarGrid";
import { FeaturedBar } from "@/components/listing/FeaturedBar";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params, searchParams }: PageProps<"/[lang]/jobs/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const sort: ReplySortKey = sp.sort === "new" || sp.sort === "old" ? sp.sort : "best";

  const [dict, user, allCategories, job] = await Promise.all([
    getDictionary(lang),
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.jobPosting.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true, slug: true, name: true, logoUrl: true, verified: true, category: true, ownerId: true,
            phone: true, email: true, website: true, whatsapp: true, address: true, city: true, state: true, zip: true,
            socialFacebook: true, socialInstagram: true, socialTiktok: true, socialYoutube: true, socialTelegram: true,
          },
        },
        poster: { select: { id: true, forumName: true } },
      },
    }),
  ]);
  if (!job) notFound();

  const t = dict.business;
  const L = dict.listing;
  const isOwner = !!user && (job.posterId === user.id || (!!job.business && job.business.ownerId === user.id));
  const canManage = isOwner || user?.role === "ADMIN";
  // A closed listing stays readable for whoever posted it (and staff); everyone else goes back to the board.
  if (!job.active && !canManage) redirect(localeHref(`/${lang}/jobs`));

  const [discussion, similar, featured, acting] = await Promise.all([
    ensureJobDiscussion(job.id),
    getSimilarJobs(job),
    getFeaturedCards("jobs", lang),
    user ? getActingBusiness() : Promise.resolve(null),
  ]);
  const viewer = user ? { id: user.id, role: user.role, isOwner: user.isOwner, canRevealAnon: user.canRevealAnon } : null;
  const thread = discussion ? await getPostView(discussion.slug, viewer, sort, lang) : null;

  const href = `/${lang}/jobs/${job.id}`;
  const loginHref = `/${lang}/login?next=${encodeURIComponent(href)}`;
  const target: ContactTarget = { module: "jobs", listingId: job.id };
  const location = [job.city, job.state ? stateLabel(job.state, lang) : null].filter(Boolean).join(", ");
  const biz = job.business;
  // Contact channels: the posting's own, falling back to the business profile's.
  const email = job.contactEmail || biz?.email || null;
  const phone = job.contactPhone || biz?.phone || null;
  const wa = whatsappUrl(biz?.whatsapp);
  const bizAddress = biz ? [biz.address, biz.city, stateLabel(biz.state, lang), biz.zip].filter(Boolean).join(", ") : "";
  const mapQuery = bizAddress || location;
  const canModerate = thread?.canModerate ?? false;
  const canReply = !!user && (!thread?.post.repliesLocked || canModerate);
  const dateStr = new Date(job.createdAt).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const canMessage = !!(job.posterId || biz?.ownerId);

  const actions = [
    email && { kind: "email", href: `mailto:${email}`, label: L.applyEmail, icon: "✉️", primary: true },
    phone && { kind: "call", href: `tel:${phone}`, label: L.call, icon: "📞" },
    wa && { kind: "whatsapp", href: wa, label: L.whatsapp, icon: "💬", external: true, className: "la-whatsapp" },
    biz?.website && { kind: "website", href: biz.website, label: L.website, icon: "🌐", external: true },
    mapQuery && { kind: "directions", href: mapsDirectionsUrl(mapQuery), label: L.directions, icon: "📍", external: true },
  ].filter(Boolean) as ListingAction[];

  const specs: Array<[string, string]> = [];
  if (job.jobType) specs.push([dict.business.jobType, jobTypeLabel(job.jobType, lang)]);
  if (job.pay) specs.push([dict.business.jobPay, job.pay]);
  if (location) specs.push([L.location, location]);
  specs.push([L.employer, biz?.name ?? job.companyName ?? job.poster?.forumName ?? "—"]);

  return (
    <ListingPage
      locale={lang}
      dict={dict}
      user={toHeaderUser(user)}
      categories={allCategories}
      back={{ href: `/${lang}/jobs`, label: t.jobsBoard }}
      banners={!job.active ? <p className="job-closed-note">🔒 {t.jobClosed}</p> : null}
      title={job.title}
      meta={[
        { icon: "📅", node: dateStr },
        {
          icon: "👤",
          node: biz ? (
            <Link href={`/${lang}/business/${biz.slug}`}>{biz.name}{biz.verified && " ✓"}</Link>
          ) : job.poster ? (
            <Link href={`/${lang}/u/${encodeURIComponent(job.poster.forumName)}`}>{job.poster.forumName}</Link>
          ) : (
            job.companyName ?? "—"
          ),
        },
        { icon: "💬", node: <a href="#questions">{L.questions.replace("{n}", String(thread?.replyCount ?? 0))}</a> },
      ]}
      hero={
        <ListingHero
          media={
            <div className="listing-hero-placeholder" aria-hidden="true">
              {biz?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={biz.logoUrl} alt="" />
              ) : (
                <span>{biz ? businessCategoryIcon(biz.category) : "💼"}</span>
              )}
            </div>
          }
          badge={job.featured ? "TOP" : null}
          manage={canManage && job.posterId ? <Link href={`${href}/edit`} className="btn btn-ghost btn-sm">✎ {dict.admin.edit}</Link> : null}
          category={
            <>
              {biz && <Link href={`/${lang}/business?category=${biz.category}`}>{businessCategoryLabel(biz.category, lang)}</Link>}
              {biz && location && " · "}
              {location}
            </>
          }
          blurb={
            <div className="listing-tags">
              {job.jobType && <span className="mk-tag">{jobTypeLabel(job.jobType, lang)}</span>}
              {job.pay && <span className="mk-tag">💵 {job.pay}</span>}
              <span className="mk-tag">{timeAgo(new Date(job.createdAt), lang)}</span>
            </div>
          }
          actions={
            <ListingActions
              target={target}
              actions={actions}
              messageHref={!isOwner && canMessage ? "#message" : undefined}
              messageLabel={L.message}
              share={<ShareMenu title={job.title} dict={dict} />}
            />
          }
        />
      }
      main={
        <>
          <Section title={t.jobAbout} icon="📝">
            <RichText doc={job.descriptionRich} text={job.description} plainClassName="job-detail-desc" />
          </Section>

          <Section title={L.details} icon="ℹ️">
            <SpecTable rows={specs} />
          </Section>

          <Section id="questions" title={`${t.jobQuestions} · ${thread?.replyCount ?? 0}`} icon="💬" plain className="job-qa">
            <p className="account-sub" style={{ marginTop: 0 }}>{t.jobQuestionsSub}</p>
            {(thread?.replyCount ?? 0) > 1 && <ReplySort current={sort} dict={dict} />}
            {!thread ? (
              <p className="muted-sm">{t.jobQuestionsUnavailable}</p>
            ) : (
              <>
                {!user ? (
                  <div className="card card-pad" style={{ marginBottom: 16 }}>
                    <Link href={loginHref}>{t.jobAskLogin}</Link>
                  </div>
                ) : thread.post.repliesLocked && !canModerate ? (
                  <p className="muted-sm" style={{ marginBottom: 16 }}>🔒 {dict.post.repliesLocked}</p>
                ) : (
                  <div style={{ marginBottom: 18 }}>
                    <ReplyComposer
                      locale={lang}
                      slug={thread.post.slug}
                      postId={thread.post.id}
                      dict={dict}
                      realName={user.forumName}
                      aliases={aliasOptions(user.id)}
                      actingAs={acting?.name ?? null}
                    />
                  </div>
                )}
                <ReplyThread
                  roots={thread.roots}
                  locale={lang}
                  slug={thread.post.slug}
                  postId={thread.post.id}
                  dict={dict}
                  canVote={!!user}
                  canReply={canReply}
                  canModerate={canModerate}
                  isLoggedIn={!!user}
                  loginHref={loginHref}
                  shareTitle={job.title}
                  realName={user?.forumName ?? ""}
                  aliases={user ? aliasOptions(user.id) : []}
                  actingAs={acting?.name ?? null}
                />
              </>
            )}
          </Section>
        </>
      }
      rail={
        <>
          <ContactCard
            title={L.apply}
            target={target}
            rows={[
              { icon: "✉️", label: L.email, value: email, href: email ? `mailto:${email}` : undefined, kind: "email" },
              { icon: "📞", label: L.phone, value: phone, href: phone ? `tel:${phone}` : undefined, kind: "call" },
              { icon: "💬", label: L.whatsapp, value: biz?.whatsapp ?? null, href: wa ?? undefined, kind: "whatsapp", external: true },
              { icon: "🌐", label: L.website, value: biz?.website ? biz.website.replace(/^https?:\/\//, "") : null, href: biz?.website ?? undefined, kind: "website", external: true },
              { icon: "📍", label: L.address, value: bizAddress || location || null },
            ]}
          />
          {biz && <SocialCard title={L.social} target={target} links={socialLinks(biz)} />}
          <LocationCard
            title={L.location}
            query={mapQuery}
            address={bizAddress || undefined}
            mapTitle={dict.estate.mapTitle}
            openLabel={L.openInMaps}
            directionsLabel={L.directions}
            target={target}
          />
          <Section id="message" title={L.messagePoster} icon="✉️">
            <MessageForm target={target} locale={lang} dict={dict} loggedIn={!!user} isOwner={isOwner} canMessage={canMessage} loginHref={loginHref} />
          </Section>
        </>
      }
      after={
        <>
          {similar.length > 0 && (
            <SimilarGrid title={L.similarJobs}>
              {similar.map((j) => (
                <Link key={j.id} href={`/${lang}/jobs/${j.id}`} className="card card-pad biz-job-board-card">
                  <div className="biz-job-board-head">
                    <span className="biz-job-board-logo" aria-hidden="true">
                      {j.business ? businessCategoryIcon(j.business.category) : "👤"}
                    </span>
                    <div>
                      <h3 className="biz-job-board-title">{j.title}</h3>
                      <span className="biz-job-company">{j.business?.name ?? j.companyName ?? ""}</span>
                    </div>
                  </div>
                  <div className="biz-card-meta">
                    {j.jobType && <span>{jobTypeLabel(j.jobType, lang)}</span>}
                    {j.pay && <><span className="sep">·</span><span>💵 {j.pay}</span></>}
                    {(j.city || j.state) && <><span className="sep">·</span><span>📍 {[j.city, j.state].filter(Boolean).join(", ")}</span></>}
                  </div>
                </Link>
              ))}
            </SimilarGrid>
          )}
          <FeaturedBar cards={featured} eyebrow={L.featuredEyebrow} title={L.featuredTitle} viewAllHref={`/${lang}/jobs`} viewAllLabel={L.viewAll} locale={lang} />
        </>
      }
    />
  );
}
