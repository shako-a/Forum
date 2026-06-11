import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { safeNext } from "@/lib/redirects";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage({ params, searchParams }: PageProps<"/[lang]/signup">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (user) redirect(`/${lang}`);

  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, lang);

  return (
    <main className="auth-wrap">
      <SignupForm locale={lang} dict={dict} next={next} />
    </main>
  );
}
