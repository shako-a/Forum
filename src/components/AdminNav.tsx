import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function AdminNav({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.admin;
  const base = `/${locale}/admin`;
  const items = [
    { href: base, label: t.dashboard },
    { href: `${base}/categories`, label: t.categories },
    { href: `${base}/ad-cards`, label: t.adCards },
    { href: `${base}/users`, label: t.users },
    { href: `${base}/hidden`, label: t.hiddenContent },
  ];
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-black/10 dark:border-white/10 p-3 text-sm">
      <div className="px-3 pb-2 font-semibold">{t.title}</div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
      <Link href={`/${locale}`} className="mt-auto rounded-md px-3 py-1.5 text-xs opacity-60 hover:bg-black/5 dark:hover:bg-white/10">
        ← {dict.common.appName}
      </Link>
    </nav>
  );
}
