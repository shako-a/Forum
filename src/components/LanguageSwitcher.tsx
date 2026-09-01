"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/lib/locale-url";

// Short labels for the compact toggle.
const SHORT: Record<Locale, string> = { en: "EN", ka: "ქარ" };

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === current) return;
    // The default language has no prefix, so this is a move between visible
    // URLs (`/business` ⇄ `/en/business`), not a segment swap.
    const target = switchLocalePath(pathname, next);
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.push(target));
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          onClick={() => switchTo(loc)}
          aria-current={loc === current}
          className={loc === current ? "active" : undefined}
          lang={loc === "ka" ? "ka" : undefined}
        >
          {SHORT[loc]}
        </button>
      ))}
    </div>
  );
}
