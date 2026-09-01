import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Who may post in each listing area. The mode lives in SiteSetting so an
// admin can flip an area from "every registered member" to "perk holders
// only" from the pricing page — no deploy, no code constant.

export const POSTING_AREAS = ["estate", "market", "auto", "jobs", "business"] as const;
export type PostingArea = (typeof POSTING_AREAS)[number];
export type PostingMode = "all" | "perk";
export const isPostingMode = (v: unknown): v is PostingMode => v === "all" || v === "perk";
export const isPostingArea = (v: unknown): v is PostingArea =>
  typeof v === "string" && (POSTING_AREAS as readonly string[]).includes(v);

// The perk catalogue key that unlocks each area once it's in "perk" mode.
export const POSTING_PERK_KEY: Record<PostingArea, string> = {
  estate: "realEstate",
  market: "market",
  auto: "auto",
  jobs: "jobPosting",
  business: "business",
};

export type PostingAccess = Record<PostingArea, PostingMode>;

const DEFAULTS: PostingAccess = { estate: "all", market: "all", auto: "all", jobs: "all", business: "all" };

export const getPostingAccess = cache(async (): Promise<PostingAccess> => {
  try {
    const row = await db.siteSetting.findUnique({
      where: { id: "singleton" },
      select: { postingEstate: true, postingMarket: true, postingAuto: true, postingJobs: true, postingBusiness: true },
    });
    if (!row) return DEFAULTS;
    const m = (v: string): PostingMode => (v === "perk" ? "perk" : "all");
    return {
      estate: m(row.postingEstate),
      market: m(row.postingMarket),
      auto: m(row.postingAuto),
      jobs: m(row.postingJobs),
      business: m(row.postingBusiness),
    };
  } catch {
    return DEFAULTS;
  }
});

type Viewer = { isPro: boolean; featureKeys?: string[] } | null | undefined;

/** May this member post in the area right now? Guests never can. */
export async function canPostIn(area: PostingArea, u: Viewer): Promise<boolean> {
  if (!u) return false;
  const access = await getPostingAccess();
  if (access[area] === "all") return true;
  return u.isPro || !!u.featureKeys?.includes(POSTING_PERK_KEY[area]);
}
