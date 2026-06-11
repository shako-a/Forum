import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { safeNext } from "@/lib/redirects";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Already logged in → no need to show the form.
  const user = await getCurrentUser();
  if (user) redirect(`/${lang}`);

  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, lang);

  return (
    <main className="auth-wrap">
      <LoginForm locale={lang} dict={dict} next={next} />
    </main>
  );
}
