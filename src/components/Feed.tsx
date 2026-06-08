import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { categoryName } from "@/i18n/localize";

// Shape of the posts produced by getHomeData (with author/category/_count includes).
export type FeedPost = {
  id: string;
  slug: string;
  title: string;
  author: { forumName: string };
  category: { nameEn: string; nameKa: string; slug: string };
  _count: { replies: number; votes: number };
};

export function Feed({
  locale,
  dict,
  posts,
}: {
  locale: Locale;
  dict: Dictionary;
  posts: FeedPost[];
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm opacity-60">
        {dict.home.feedEmpty}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-lg border border-black/10 dark:border-white/10 p-4 hover:border-foreground/30"
        >
          <div className="mb-1 flex items-center gap-2 text-xs opacity-60">
            <Link href={`/${locale}/c/${post.category.slug}`} className="hover:underline">
              {categoryName(post.category, locale)}
            </Link>
            <span>•</span>
            <span>{post.author.forumName}</span>
          </div>
          <Link href={`/${locale}/p/${post.slug}`}>
            <h3 className="text-base font-semibold hover:underline">{post.title}</h3>
          </Link>
          <div className="mt-2 flex gap-4 text-xs opacity-60">
            <span>▲ {post._count.votes}</span>
            <span>💬 {post._count.replies}</span>
            <span>{dict.post.share}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
