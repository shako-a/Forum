import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { categoryName } from "@/i18n/localize";
import { Header } from "@/components/Header";
import { CreatePostForm } from "@/components/CreatePostForm";

export const dynamic = "force-dynamic";

export default async function CreatePostPage({ params, searchParams }: PageProps<"/[lang]/create">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Only logged-in users can post; send guests to login and back here after.
  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/create`);

  const dict = await getDictionary(lang);
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const categories = cats.map((c) => ({ id: c.id, name: categoryName(c, lang) }));

  // Optional preselect when coming from inside a category (?category=slug).
  const sp = await searchParams;
  const slug = typeof sp.category === "string" ? sp.category : undefined;
  const defaultCategoryId = slug ? cats.find((c) => c.slug === slug)?.id : undefined;

  return (
    <>
      <Header locale={lang} dict={dict} user={{ forumName: user.forumName }} />
      <main className="create-wrap">
        <CreatePostForm
          locale={lang}
          dict={dict}
          categories={categories}
          defaultCategoryId={defaultCategoryId}
        />
      </main>
    </>
  );
}
