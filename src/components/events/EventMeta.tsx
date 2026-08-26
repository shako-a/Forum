import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { eventTiming, formatEventRange } from "@/lib/events";

// The "when / where" panel at the top of an event page.
export function EventMeta({
  startsAt,
  endsAt,
  location,
  url,
  locale,
  dict,
}: {
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  url: string | null;
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.events;
  const timing = eventTiming(startsAt, endsAt);

  return (
    <div className={`event-panel event-panel-${timing}`}>
      <div className="event-panel-when">
        <span className="event-panel-ico" aria-hidden="true">🗓</span>
        <div>
          <div className="event-panel-date">{formatEventRange(startsAt, endsAt, locale)}</div>
          <div className="event-panel-tz">{t.timesUtc}</div>
        </div>
        {timing === "live" && <span className="event-badge-live">{t.happeningNow}</span>}
        {timing === "past" && <span className="event-badge-past">{t.finished}</span>}
      </div>

      {location && (
        <div className="event-panel-line">
          <span className="event-panel-ico" aria-hidden="true">📍</span>
          <span>{location}</span>
        </div>
      )}
      {url && (
        <div className="event-panel-line">
          <span className="event-panel-ico" aria-hidden="true">🔗</span>
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="admin-link">
            {t.eventLink}
          </a>
        </div>
      )}
    </div>
  );
}
