import type { Locale } from "@/i18n/config";
import type { RsvpStatus } from "@/generated/prisma/client";

// Events: shared vocabulary and date formatting.
//
// Times are stored and rendered as wall-clock UTC — see the schema note on
// Post.eventStartsAt. An event happens at a venue, so the organiser's "19:00"
// must read as 19:00 to everyone; shifting it into each viewer's own zone
// would tell someone in Tbilisi to show up at a Chicago meetup at 03:00.

// --- who may create events -------------------------------------------------
// The vocabulary lives here rather than in event-access.ts because the admin
// panel is a client component: event-access.ts is server-only (it reads the
// database), so importing its values into the browser bundle would drag Prisma
// along with them.

export const EVENT_MODES = ["all", "verified", "label", "perk", "staff"] as const;
export type EventMode = (typeof EVENT_MODES)[number];

export const isEventMode = (v: unknown): v is EventMode =>
  typeof v === "string" && (EVENT_MODES as readonly string[]).includes(v);

/** Perk catalogue key that unlocks events in "perk" mode. */
export const EVENT_PERK_KEY = "events";

export type EventAccess = { mode: EventMode; labelId: string | null };

export const RSVP_STATUSES = ["GOING", "INTERESTED", "NOT_GOING"] as const;

export const isRsvpStatus = (v: unknown): v is RsvpStatus =>
  typeof v === "string" && (RSVP_STATUSES as readonly string[]).includes(v);

export type RsvpCounts = Record<RsvpStatus, number>;

export const emptyRsvpCounts = (): RsvpCounts => ({ GOING: 0, INTERESTED: 0, NOT_GOING: 0 });

/** How far past its start an event still counts as "on now". */
const LIVE_GRACE_MS = 3 * 60 * 60 * 1000; // 3h, for events with no end time

export type EventTiming = "upcoming" | "live" | "past";

export function eventTiming(startsAt: Date, endsAt: Date | null, now: Date = new Date()): EventTiming {
  const t = now.getTime();
  const start = startsAt.getTime();
  const end = endsAt ? endsAt.getTime() : start + LIVE_GRACE_MS;
  if (t < start) return "upcoming";
  return t <= end ? "live" : "past";
}

// --- formatting -------------------------------------------------------------

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
};
const TIME_OPTS: Intl.DateTimeFormatOptions = { timeZone: "UTC", hour: "2-digit", minute: "2-digit" };

const sameDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

/** "Sat, 14 Sep · 19:00 — 22:00", or across days, "… — Sun, 15 Sep 02:00". */
export function formatEventRange(startsAt: Date, endsAt: Date | null, locale: Locale): string {
  const withYear = startsAt.getUTCFullYear() !== new Date().getUTCFullYear();
  const dateOpts = withYear ? { ...DATE_OPTS, year: "numeric" as const } : DATE_OPTS;
  const start = `${startsAt.toLocaleDateString(locale, dateOpts)} · ${startsAt.toLocaleTimeString(locale, TIME_OPTS)}`;
  if (!endsAt) return start;
  const end = sameDay(startsAt, endsAt)
    ? endsAt.toLocaleTimeString(locale, TIME_OPTS)
    : `${endsAt.toLocaleDateString(locale, dateOpts)} · ${endsAt.toLocaleTimeString(locale, TIME_OPTS)}`;
  return `${start} — ${end}`;
}

/** Compact two-line badge for feed cards: month above, day below. */
export function eventBadgeParts(startsAt: Date, locale: Locale): { month: string; day: string } {
  return {
    month: startsAt.toLocaleDateString(locale, { timeZone: "UTC", month: "short" }),
    day: startsAt.toLocaleDateString(locale, { timeZone: "UTC", day: "numeric" }),
  };
}

// --- form <-> storage -------------------------------------------------------

// <input type="datetime-local"> produces "YYYY-MM-DDTHH:mm" with no zone.
// Parse it as UTC so the stored instant *is* the wall-clock the organiser
// typed, matching how it will be rendered.
export function parseEventDateTime(raw: unknown): Date | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return null;
  const d = new Date(`${s.length === 16 ? s : s.slice(0, 16)}:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Back to the "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
export function toEventDateTimeInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 16) : "";
}
