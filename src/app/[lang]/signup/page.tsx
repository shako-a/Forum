import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SignupForm } from "@/components/SignupForm";

export default async function SignupPage({ params }: PageProps<"/[lang]/signup">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <SignupForm locale={lang} dict={dict} />
    </main>
  );
}
