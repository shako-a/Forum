"use client";

import Link from "next/link";
import { track } from "@/lib/track";

// The tier card's call-to-action. A thin client wrapper so clicking it can log a
// GA4 `select_tier` event (upgrade intent) before navigating to the package page.
export function TierCta({ href, slug, label }: { href: string; slug: string; label: string }) {
  return (
    <Link
      href={href}
      className="btn btn-primary btn-full tier-cta"
      onClick={() => track("select_tier", { tier: slug })}
    >
      {label}
    </Link>
  );
}
