"use client";

import { trackListingInteraction } from "@/app/actions/listing-contact";
import { track } from "@/lib/track";
import type { ContactTarget, InteractionKind } from "@/lib/modules";

// An outbound contact link that reports the click before the browser follows
// it. Fire-and-forget: the navigation never waits on the ledger, and a failed
// write is invisible to the visitor.
export function TrackedLink({
  target,
  kind,
  href,
  className,
  external = false,
  title,
  children,
}: {
  target: ContactTarget;
  kind: InteractionKind;
  href: string;
  className?: string;
  external?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      title={title}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer nofollow" : undefined}
      onClick={() => {
        void trackListingInteraction(target, kind);
        track("listing_contact", { module: target.module, kind });
      }}
    >
      {children}
    </a>
  );
}
