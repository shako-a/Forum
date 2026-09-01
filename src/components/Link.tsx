import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localeHref } from "@/lib/locale-url";

// Drop-in replacement for next/link that hides the default locale's prefix.
//
// Pages build hrefs as `/${lang}/…` because that is what the route tree looks
// like; this is the one place that turns them into the URLs visitors see, so
// `/ka/business` is rendered as `/business` without every call site having to
// remember. Swapping the import is the whole change a file needs.
//
// The cast is deliberate: with typed routes the generated union describes the
// internal tree (`/[lang]/business`), and the public URL we emit (`/business`)
// isn't in it. The proxy maps one onto the other, so the runtime value is a
// real route even though the type system can't express it.
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const normalized = typeof href === "string" ? (localeHref(href) as typeof href) : href;
  return <NextLink href={normalized} {...rest} />;
}
