"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === current) return;
    // Replace the leading /<locale> segment with the chosen one.
    const segments = pathname.split("/");
    segments[1] = next;
    const target = segments.join("/") || `/${next}`;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.push(target));
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-black/10 dark:border-white/15 p-0.5 text-sm">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          onClick={() => switchTo(loc)}
          aria-current={loc === current}
          className={`rounded px-2 py-0.5 transition-colors ${
            loc === current
              ? "bg-foreground text-background"
              : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
