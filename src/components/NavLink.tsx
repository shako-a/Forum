"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={`${className}${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
