import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { StaticPage } from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export default async function ModeratorsPage({ params }: PageProps<"/[lang]/moderators">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <StaticPage lang={lang} titleKey="moderators" />;
}
