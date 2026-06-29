import { notFound, redirect } from "next/navigation";
import { toHeaderUser } from "@/lib/header-user";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, canModerateCategory } from "@/lib/dal";
import { db } from "@/lib/db";
import { categoryName } from "@/i18n/localize";
import { Header } from "@/components/Header";
import { EditPostForm } from "@/components/EditPostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: PageProps<"/[lang]/p/[slug]/edit">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/p/${slug}/edit`);

  const post = await db.post.findUnique({
    where: { slug },
    select: { id: true, title: true, body: true, categoryId: true, authorId: true },
  });
  if (!post) notFound();

  const canEdit = post.authorId === user.id || (await canModerateCategory(user, post.categoryId));
  if (!canEdit) redirect(`/${lang}/p/${slug}`);

  const dict = await getDictionary(lang);
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const categories = cats.map((c) => ({ id: c.id, name: categoryName(c, lang) }));

  return (
    <>
      <Header locale={lang} dict={dict} user={toHeaderUser(user)} />
      <main className="create-wrap">
        <EditPostForm
          locale={lang}
          dict={dict}
          postId={post.id}
          categories={categories}
          currentCategoryId={post.categoryId}
          title={post.title}
          bodyDoc={JSON.stringify(post.body)}
        />
      </main>
    </>
  );
}
