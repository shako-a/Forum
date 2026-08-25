import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ReportsAdmin, type AdminReport, type ReportFilters } from "@/components/admin/ReportsAdmin";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = new Set(["open", "resolved", "dismissed", "all"]);
const TYPE_FILTERS = new Set(["all", "market", "estate", "post", "reply", "dm"]);

export default async function AdminReportsPage({ params, searchParams }: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN");
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const filters: ReportFilters = {
    status: typeof sp.status === "string" && STATUS_FILTERS.has(sp.status) ? sp.status : "open",
    type: typeof sp.type === "string" && TYPE_FILTERS.has(sp.type) ? sp.type : "all",
  };

  const where: Prisma.ReportWhereInput = {
    ...(filters.status === "all" ? {} : { status: filters.status.toUpperCase() }),
    ...(filters.type === "market"
      ? { marketListingId: { not: null } }
      : filters.type === "estate"
        ? { propertyListingId: { not: null } }
      : filters.type === "post"
        ? { postId: { not: null } }
        : filters.type === "reply"
          ? { replyId: { not: null } }
          : filters.type === "dm"
            ? { conversationId: { not: null } }
            : {}),
  };

  const [rows, openCount] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        reporter: { select: { forumName: true } },
        reportedUser: { select: { id: true, forumName: true } },
        resolvedBy: { select: { forumName: true } },
        post: { select: { slug: true } },
        reply: { select: { id: true, post: { select: { slug: true } } } },
        marketListing: {
          select: { id: true, slug: true, title: true, price: true, priceType: true, status: true, photos: true },
        },
        propertyListing: { select: { id: true, slug: true, title: true, price: true, kind: true, active: true, photos: true } },
      },
    }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);

  // Investigation context: how many open reports each listing has, and how
  // many reports (any state) each reported seller has accumulated.
  const listingIds = [...new Set(rows.map((r) => r.marketListingId).filter((x): x is string => !!x))];
  const sellerIds = [...new Set(rows.filter((r) => r.marketListingId).map((r) => r.reportedUserId).filter((x): x is string => !!x))];
  const [perListing, perSeller] = await Promise.all([
    listingIds.length
      ? db.report.groupBy({ by: ["marketListingId"], where: { marketListingId: { in: listingIds }, status: "OPEN" }, _count: { _all: true } })
      : [],
    sellerIds.length
      ? db.report.groupBy({ by: ["reportedUserId"], where: { reportedUserId: { in: sellerIds } }, _count: { _all: true } })
      : [],
  ]);
  const listingOpen = new Map(perListing.map((g) => [g.marketListingId, g._count._all]));
  const sellerTotal = new Map(perSeller.map((g) => [g.reportedUserId, g._count._all]));

  const td = dict.admin;
  const reports: AdminReport[] = rows.map((r) => {
    let target: { href: string; label: string } | null = null;
    let type: AdminReport["type"] = "other";
    if (r.marketListing) {
      type = "market";
    } else if (r.propertyListing) {
      type = "estate";
      target = { href: `/${lang}/realestate/${r.propertyListing.slug}`, label: td.reportEstate };
    } else if (r.reply?.post) {
      type = "reply";
      target = { href: `/${lang}/p/${r.reply.post.slug}#r-${r.reply.id}`, label: td.reportReply };
    } else if (r.post) {
      type = "post";
      target = { href: `/${lang}/p/${r.post.slug}`, label: td.reportPost };
    } else if (r.conversationId) {
      type = "dm";
      target = { href: `/${lang}/inbox`, label: td.reportDm };
    }
    const l = r.marketListing;
    return {
      id: r.id,
      type,
      reporter: r.reporter.forumName,
      reported: r.reportedUser?.forumName ?? null,
      reportedId: r.reportedUser?.id ?? null,
      reason: r.reason,
      context: r.context,
      target,
      listing: l
        ? {
            id: l.id,
            slug: l.slug,
            title: l.title,
            priceLabel: l.priceType === "FREE" ? dict.market.free : `$${l.price.toLocaleString("en-US")}`,
            status: l.status,
            thumb: l.photos[0] ?? null,
            sellerId: r.reportedUser?.id ?? null,
            sellerName: r.reportedUser?.forumName ?? null,
            openReportsOnListing: listingOpen.get(l.id) ?? 0,
            reportsAboutSeller: r.reportedUserId ? (sellerTotal.get(r.reportedUserId) ?? 0) : 0,
          }
        : null,
      estate: r.propertyListing
        ? {
            id: r.propertyListing.id,
            slug: r.propertyListing.slug,
            title: r.propertyListing.title,
            priceLabel: `$${r.propertyListing.price.toLocaleString("en-US")}${r.propertyListing.kind === "RENT" ? "/mo" : ""}`,
            active: r.propertyListing.active,
            thumb: r.propertyListing.photos[0] ?? null,
          }
        : null,
      status: r.status,
      note: r.note,
      resolvedBy: r.resolvedBy?.forumName ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return <ReportsAdmin dict={dict} locale={lang} reports={reports} filters={filters} openCount={openCount} />;
}
