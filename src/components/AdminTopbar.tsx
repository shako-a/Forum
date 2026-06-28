"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Role } from "@/generated/prisma/client";

// Slim control-room top bar: current section + who's signed in + escape hatch.
export function AdminTopbar({
  locale,
  dict,
  userName,
  role,
}: {
  locale: Locale;
  dict: Dictionary;
  userName: string;
  role: Role;
}) {
  const pathname = usePathname();
  const t = dict.admin;
  const base = `/${locale}/admin`;

  const sections: [string, string][] = [
    [`${base}/popular`, t.postManagement],
    [`${base}/ad-cards`, t.adCards],
    [`${base}/categories`, t.categories],
    [`${base}/labels`, t.labels],
    [`${base}/users`, t.users],
    [`${base}/businesses`, dict.business.directory],
    [`${base}/jobs`, dict.business.jobs],
    [`${base}/reports`, t.reports],
    [`${base}/hidden`, t.hiddenContent],
  ];
  const title = sections.find(([href]) => pathname.startsWith(href))?.[1] ?? t.dashboard;

  const roleLabel = role === "ADMIN" ? dict.roles.admin : dict.roles.moderator;

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-title">{title}</div>
      <div className="admin-topbar-right">
        <LanguageSwitcher current={locale} />
        <span className="admin-whoami">
          <b>{userName}</b>
          <span className="admin-role-chip">{roleLabel}</span>
        </span>
        <Link href={`/${locale}`} className="admin-view-site">
          {t.viewSite} ↗
        </Link>
      </div>
    </header>
  );
}
