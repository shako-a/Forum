import "server-only";
import { db } from "@/lib/db";
import type { InteractionKind, ModuleKey } from "@/lib/modules";

// The contact ledger behind Admin → Enquiries: who is getting approached,
// through which button, from which module. See the ListingInteraction model.

export type ListingTarget = {
  module: ModuleKey;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  /** The business this lead belongs to, when the listing is or belongs to one. */
  businessId: string | null;
  /** The member who owns the listing — who a message goes to. */
  recipientId: string | null;
};

/**
 * Turn a (module, id) the client named into a trusted target by reading the
 * row. Everything the ledger stores about the listing comes from here, never
 * from the form, so a visitor can't credit a lead to someone else's business
 * or route a message to an arbitrary member.
 */
export async function resolveListingTarget(module: ModuleKey, listingId: string): Promise<ListingTarget | null> {
  switch (module) {
    case "business": {
      const b = await db.business.findUnique({
        where: { id: listingId },
        select: { id: true, slug: true, name: true, ownerId: true },
      });
      return b ? { module, listingId: b.id, listingTitle: b.name, listingSlug: b.slug, businessId: b.id, recipientId: b.ownerId } : null;
    }
    case "jobs": {
      const j = await db.jobPosting.findUnique({
        where: { id: listingId },
        select: { id: true, title: true, businessId: true, posterId: true, business: { select: { ownerId: true } } },
      });
      return j
        ? { module, listingId: j.id, listingTitle: j.title, listingSlug: j.id, businessId: j.businessId, recipientId: j.posterId ?? j.business?.ownerId ?? null }
        : null;
    }
    case "estate": {
      const l = await db.propertyListing.findUnique({
        where: { id: listingId },
        select: { id: true, slug: true, title: true, ownerId: true },
      });
      return l ? { module, listingId: l.id, listingTitle: l.title, listingSlug: l.slug, businessId: null, recipientId: l.ownerId } : null;
    }
    case "market": {
      const l = await db.marketListing.findUnique({
        where: { id: listingId },
        select: { id: true, slug: true, title: true, sellerId: true, sellerBusinessId: true },
      });
      return l ? { module, listingId: l.id, listingTitle: l.title, listingSlug: l.slug, businessId: l.sellerBusinessId, recipientId: l.sellerId } : null;
    }
    case "auto": {
      const l = await db.autoListing.findUnique({
        where: { id: listingId },
        select: { id: true, slug: true, title: true, ownerId: true },
      });
      return l ? { module, listingId: l.id, listingTitle: l.title, listingSlug: l.slug, businessId: null, recipientId: l.ownerId } : null;
    }
  }
}

/** Append to the ledger. Best-effort: a lead is worth recording, never worth failing the page for. */
export async function recordInteraction(
  t: ListingTarget,
  kind: InteractionKind,
  senderId: string | null,
  extra?: { conversationId?: string; body?: string },
): Promise<void> {
  try {
    await db.listingInteraction.create({
      data: {
        module: t.module,
        listingId: t.listingId,
        listingTitle: t.listingTitle,
        listingSlug: t.listingSlug,
        businessId: t.businessId,
        recipientId: t.recipientId,
        senderId,
        kind,
        conversationId: extra?.conversationId ?? null,
        body: extra?.body ?? null,
      },
    });
  } catch (err) {
    console.error("Listing interaction not recorded:", err instanceof Error ? err.message : err);
  }
}

// --- Admin queries -----------------------------------------------------------

export type KindCounts = Partial<Record<InteractionKind, number>>;

export async function getInteractionStats(since: Date, module?: ModuleKey): Promise<{ total: number; byKind: KindCounts }> {
  const rows = await db.listingInteraction.groupBy({
    by: ["kind"],
    where: { createdAt: { gte: since }, ...(module ? { module } : {}) },
    _count: { _all: true },
  });
  const byKind: KindCounts = {};
  let total = 0;
  for (const r of rows) {
    byKind[r.kind as InteractionKind] = r._count._all;
    total += r._count._all;
  }
  return { total, byKind };
}

export type BusinessApproach = {
  businessId: string;
  name: string;
  slug: string;
  total: number;
  byKind: KindCounts;
  lastAt: Date;
};

/** Businesses ranked by how often they were contacted in the window. */
export async function getApproachedBusinesses(since: Date, take = 50): Promise<BusinessApproach[]> {
  const rows = await db.listingInteraction.groupBy({
    by: ["businessId", "kind"],
    where: { createdAt: { gte: since }, businessId: { not: null } },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const acc = new Map<string, { total: number; byKind: KindCounts; lastAt: Date }>();
  for (const r of rows) {
    if (!r.businessId) continue;
    const cur = acc.get(r.businessId) ?? { total: 0, byKind: {}, lastAt: new Date(0) };
    cur.total += r._count._all;
    cur.byKind[r.kind as InteractionKind] = r._count._all;
    if (r._max.createdAt && r._max.createdAt > cur.lastAt) cur.lastAt = r._max.createdAt;
    acc.set(r.businessId, cur);
  }
  const ids = [...acc.keys()];
  if (ids.length === 0) return [];
  const names = await db.business.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } });
  const nameOf = new Map(names.map((b) => [b.id, b]));
  return ids
    .map((id) => {
      const b = nameOf.get(id);
      const a = acc.get(id)!;
      return { businessId: id, name: b?.name ?? "—", slug: b?.slug ?? "", total: a.total, byKind: a.byKind, lastAt: a.lastAt };
    })
    .sort((x, y) => y.total - x.total)
    .slice(0, take);
}

export async function getRecentInteractions(opts: { since: Date; module?: ModuleKey; kind?: InteractionKind; take?: number }) {
  return db.listingInteraction.findMany({
    where: {
      createdAt: { gte: opts.since },
      ...(opts.module ? { module: opts.module } : {}),
      ...(opts.kind ? { kind: opts.kind } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 100,
    include: {
      sender: { select: { forumName: true } },
      recipient: { select: { forumName: true } },
      business: { select: { name: true, slug: true } },
    },
  });
}
