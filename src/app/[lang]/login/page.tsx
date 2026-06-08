import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm locale={lang} dict={dict} />
    </main>
  );
}
