import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Cookieless visitor counting.
//
// Each visitor is reduced to sha256(dailySalt + ip + user-agent) truncated to
// 32 hex chars. The salt includes the UTC date, so yesterday's hash for the
// same person is unrelated to today's: the table can answer "how many unique
// visitors this month" without storing anything that follows an individual
// around. No cookie is set, so this needs no consent banner — which matters
// for the EU sister forum.

const VISITOR_WINDOW_DAYS = 30;
// Rows older than this are swept away; keeps the table bounded.
const RETENTION_DAYS = 120;

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoKey(days: number): string {
  return dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

// Obvious crawlers shouldn't inflate the count.
const BOT_RE = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headlesschrome|lighthouse|curl|wget|python-requests|monitor|uptime|preview/i;

// Hashes already written this process-day, so repeat page views cost nothing.
const seen = new Set<string>();

function visitorHash(ip: string, ua: string, day: string): string {
  const salt = process.env.SESSION_SECRET ?? "geoglobally";
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

/**
 * Record that someone loaded a page today. Safe to call on every request:
 * it's deduplicated in memory and never throws or blocks rendering.
 */
export async function recordVisit(): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return;
    // Trust the first hop from the proxy/CDN; fall back to the direct peer.
    const ip =
      h.get("cf-connecting-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "";
    if (!ip) return;

    const day = dayKey();
    const hash = visitorHash(ip, ua, day);
    const memo = `${hash}:${day}`;
    if (seen.has(memo)) return;
    // Bound the memo set; a new day's hashes differ anyway.
    if (seen.size > 50_000) seen.clear();
    seen.add(memo);

    await db.visitorDay.createMany({ data: [{ hash, day }], skipDuplicates: true });

    // Opportunistic sweep, roughly once per 200 first-hits of the day.
    if (Math.random() < 0.005) {
      await db.visitorDay.deleteMany({ where: { day: { lt: daysAgoKey(RETENTION_DAYS) } } });
    }
  } catch {
    // Counting visitors must never break a page render.
  }
}

// Distinct-visitor counts are cached briefly — they feed a sidebar stat, not
// a dashboard that needs to be exact to the second.
let cache: { at: number; days: number; value: number } | null = null;
const CACHE_MS = 2 * 60 * 1000;

/**
 * Unique visitors over the last `days` days (default 30). The public sidebar
 * reads the cached value; pass `fresh` for the admin dashboard, where a stat
 * lagging behind the "today" tile next to it would just look broken.
 */
export async function countVisitors(days = VISITOR_WINDOW_DAYS, fresh = false): Promise<number> {
  if (!fresh && cache && cache.days === days && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const rows = await db.visitorDay.groupBy({
      by: ["hash"],
      where: { day: { gte: daysAgoKey(days) } },
    });
    cache = { at: Date.now(), days, value: rows.length };
    return rows.length;
  } catch {
    return cache?.value ?? 0;
  }
}

/** Unique visitors today — used on the admin dashboard next to "online". */
export async function countVisitorsToday(): Promise<number> {
  try {
    return await db.visitorDay.count({ where: { day: dayKey() } });
  } catch {
    return 0;
  }
}

export { VISITOR_WINDOW_DAYS };
