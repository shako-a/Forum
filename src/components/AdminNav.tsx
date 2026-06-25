"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function AdminNav({
  locale,
  dict,
  isAdmin,
}: {
  locale: Locale;
  dict: Dictionary;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const t = dict.admin;
  const base = `/${locale}/admin`;

  // Moderators get a moderation-only panel (Hidden content); admins see all.
  const items = isAdmin
    ? [
        { href: base, label: t.dashboard, icon: "📊" },
        { href: `${base}/categories`, label: t.categories, icon: "🗂" },
        { href: `${base}/ad-cards`, label: t.adCards, icon: "📢" },
        { href: `${base}/labels`, label: t.labels, icon: "🏷" },
        { href: `${base}/users`, label: t.users, icon: "👥" },
        { href: `${base}/businesses`, label: dict.business.directory, icon: "💼" },
        { href: `${base}/hidden`, label: t.hiddenContent, icon: "🙈" },
      ]
    : [{ href: `${base}/hidden`, label: t.hiddenContent, icon: "🙈" }];

  return (
    <nav className="admin-nav">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== base && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-link${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="admin-nav-ico" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
