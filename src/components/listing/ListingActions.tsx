"use client";

import { TrackedLink } from "@/components/listing/TrackedLink";
import type { ContactTarget, InteractionKind } from "@/lib/modules";

export type ListingAction = {
  kind: InteractionKind;
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
  external?: boolean;
  className?: string;
};

// The button grid in the hero: Call · WhatsApp · Email · Website · Book ·
// Directions, then Message / Save / Share. Every outbound one is tracked.
export function ListingActions({
  target,
  actions,
  messageHref,
  messageLabel,
  save,
  share,
}: {
  target: ContactTarget;
  actions: ListingAction[];
  messageHref?: string;
  messageLabel?: string;
  save?: React.ReactNode;
  share?: React.ReactNode;
}) {
  return (
    <div className="la-grid">
      {actions.map((a) => (
        <TrackedLink
          key={a.kind + a.href}
          target={target}
          kind={a.kind}
          href={a.href}
          external={a.external}
          className={`la-btn${a.primary ? " la-primary" : ""}${a.className ? ` ${a.className}` : ""}`}
        >
          <span className="la-ico" aria-hidden="true">{a.icon}</span>
          {a.label}
        </TrackedLink>
      ))}
      {messageHref && messageLabel && (
        <a href={messageHref} className="la-btn la-message">
          <span className="la-ico" aria-hidden="true">✉️</span>
          {messageLabel}
        </a>
      )}
      {save && <div className="la-slot">{save}</div>}
      {share && <div className="la-slot">{share}</div>}
    </div>
  );
}
