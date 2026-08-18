import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { ResetForm } from "@/components/ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params, searchParams }: PageProps<"/[lang]/reset">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  if (await getCurrentUser()) redirect(`/${lang}`);
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  // No token at all → nothing to do here; send them to the request form.
  if (!token) redirect(`/${lang}/forgot`);
  return (
    <main className="auth-wrap">
      <ResetForm locale={lang} dict={dict} token={token} />
    </main>
  );
}
