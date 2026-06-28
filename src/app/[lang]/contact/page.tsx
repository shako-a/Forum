import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { StaticPage } from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <StaticPage lang={lang} titleKey="contact" />;
}
