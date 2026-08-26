import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { EVENT_PERK_KEY, isEventMode, type EventAccess, type EventMode } from "@/lib/events";

// Re-exported so server callers can keep importing the whole gate from here.
export { EVENT_MODES, EVENT_PERK_KEY, isEventMode, type EventAccess, type EventMode } from "@/lib/events";

// Who may create Events.
//
// The mode lives in SiteSetting so it can change without a deploy. It starts
// at "verified" — a member who has confirmed their email — and can be widened
// to every member, narrowed to staff, or tied to a tag or a paid perk as the
// community grows. "label" is the hook for the achievement/tag idea: award a
// tag (Admin → Tags) and everyone holding it can post events.

const DEFAULT: EventAccess = { mode: "verified", labelId: null };

export const getEventAccess = cache(async (): Promise<EventAccess> => {
  try {
    const row = await db.siteSetting.findUnique({
      where: { id: "singleton" },
      select: { eventsMode: true, eventsLabelId: true },
    });
    if (!row) return DEFAULT;
    return {
      mode: isEventMode(row.eventsMode) ? row.eventsMode : DEFAULT.mode,
      labelId: row.eventsLabelId,
    };
  } catch {
    return DEFAULT;
  }
});

type Viewer =
  | {
      id: string;
      role: string;
      emailVerified: boolean;
      isPro: boolean;
      featureKeys?: string[];
    }
  | null
  | undefined;

/**
 * May this member create an event right now? Guests never can.
 *
 * Staff are allowed under every mode: an admin locked out of a feature they
 * administer can't test or fix it. Membership of the configured tag is checked
 * against the database rather than a cached list, so revoking a tag takes
 * effect on the member's next action.
 */
export async function canCreateEvents(u: Viewer): Promise<boolean> {
  if (!u) return false;
  const staff = u.role === "ADMIN" || u.role === "MODERATOR";
  if (staff) return true;

  const { mode, labelId } = await getEventAccess();
  switch (mode) {
    case "all":
      return true;
    case "verified":
      return u.emailVerified;
    case "perk":
      return u.isPro || !!u.featureKeys?.includes(EVENT_PERK_KEY);
    case "label": {
      if (!labelId) return false;
      const hit = await db.user.findFirst({
        where: { id: u.id, labels: { some: { id: labelId } } },
        select: { id: true },
      });
      return !!hit;
    }
    case "staff":
      return false; // staff already returned true above
  }
}

/** Why a member can't post — drives the explanatory notice on the events page. */
export async function eventGateReason(u: Viewer): Promise<EventMode | null> {
  if (await canCreateEvents(u)) return null;
  return (await getEventAccess()).mode;
}
