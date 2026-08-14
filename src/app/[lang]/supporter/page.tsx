import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";

// Legacy route. Packages are now canonically served from /[lang]/more/<slug>
// (dynamic, so admin-created packages get a page too); this redirect keeps
// older links — and the header's "Ask AI" upsell — working.
export default async function LegacyPackageRoute({ params }: PageProps<"/[lang]/supporter">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(`/${lang}/more/supporter`);
}
