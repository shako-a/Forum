"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { localeHref } from "@/lib/locale-url";

// Sidebar nav link that highlights itself when its route is active. `exact` is
// for Home (/[locale]), which is a prefix of every page.
export function NavLink({
  href,
  exact = false,
  className = "nav-item",
  children,
}: {
  href: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // usePathname reports the URL the visitor sees (`/business`), while callers
  // pass the internal form (`/ka/business`) — compare like with like.
  const target = localeHref(href);
  const active = exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
  return (
    <Link href={href} className={`${className}${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
