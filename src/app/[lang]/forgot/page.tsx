import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { ForgotForm } from "@/components/ForgotForm";

export const dynamic = "force-dynamic";

export default async function ForgotPage({ params }: PageProps<"/[lang]/forgot">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  if (await getCurrentUser()) redirect(`/${lang}`); // already signed in
  const dict = await getDictionary(lang);
  return (
    <main className="auth-wrap">
      <ForgotForm locale={lang} dict={dict} />
    </main>
  );
}
