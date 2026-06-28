"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type NavLink = { href: string; label: string; icon: string };
type NavGroup = { group: string; icon: string; children: NavLink[] };
type NavEntry = NavLink | NavGroup;

function isActive(pathname: string, href: string, base: string): boolean {
  return pathname === href || (href !== base && pathname.startsWith(href));
}

function NavLinkItem({ item, active }: { item: NavLink; active: boolean }) {
  return (
    <Link
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
}

function NavGroupItem({ group, base, pathname }: { group: NavGroup; base: string; pathname: string }) {
  const anyActive = group.children.some((c) => isActive(pathname, c.href, base));
  const [open, setOpen] = useState(anyActive);
  return (
    <div className="admin-nav-group">
      <button
        type="button"
        className={`admin-nav-link admin-nav-grouphdr${anyActive ? " active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="admin-nav-ico" aria-hidden="true">
          {group.icon}
        </span>
        {group.group}
        <span className={`admin-nav-caret${open ? " open" : ""}`} aria-hidden="true">
          ▸
        </span>
      </button>
      {open && (
        <div className="admin-nav-children">
          {group.children.map((c) => (
            <NavLinkItem key={c.href} item={c} active={isActive(pathname, c.href, base)} />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const entries: NavEntry[] = isAdmin
    ? [
        { href: base, label: t.dashboard, icon: "📊" },
        {
          group: t.popularBar,
          icon: "🔥",
          children: [
            { href: `${base}/popular`, label: t.postManagement, icon: "📝" },
            { href: `${base}/ad-cards`, label: t.adCards, icon: "📢" },
          ],
        },
        { href: `${base}/categories`, label: t.categories, icon: "🗂" },
        { href: `${base}/labels`, label: t.labels, icon: "🏷" },
        { href: `${base}/users`, label: t.users, icon: "👥" },
        {
          group: t.businessGroup,
          icon: "💼",
          children: [
            { href: `${base}/businesses`, label: dict.business.directory, icon: "🏢" },
            { href: `${base}/jobs`, label: dict.business.jobs, icon: "📋" },
          ],
        },
        { href: `${base}/reports`, label: t.reports, icon: "⚑" },
        { href: `${base}/hidden`, label: t.hiddenContent, icon: "🙈" },
      ]
    : [{ href: `${base}/hidden`, label: t.hiddenContent, icon: "🙈" }];

  return (
    <nav className="admin-nav">
      {entries.map((e) =>
        "group" in e ? (
          <NavGroupItem key={e.group} group={e} base={base} pathname={pathname} />
        ) : (
          <NavLinkItem key={e.href} item={e} active={isActive(pathname, e.href, base)} />
        ),
      )}
    </nav>
  );
}
