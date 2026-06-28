import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { StaticPage } from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <StaticPage lang={lang} titleKey="privacy" />;
}
