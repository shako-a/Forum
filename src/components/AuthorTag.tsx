import Link from "next/link";
import type { DisplayAuthor } from "@/lib/anon";

// Renders an author byline. Real authors link to their profile; anonymous
// authors show their generated alias (no link), with the real name appended
// only when the viewer is authorized to de-anonymize.
export function AuthorTag({ author }: { author: DisplayAuthor }) {
  if (author.anonymous) {
    return (
      <span className="author author-anon" style={author.color ? { color: author.color } : undefined}>
        🕶 {author.name}
        {author.realName && <span className="author-reveal"> ({author.realName})</span>}
      </span>
    );
  }
  // Business identity: a small badge/logo + link to the business page. Staff may
  // see which human posted it (realName).
  if (author.isBusiness && author.href) {
    return (
      <Link href={author.href} className="author author-business">
        <span className="author-biz-badge" aria-hidden="true">🏢</span>
        {author.name}
        {author.realName && <span className="author-reveal"> ({author.realName})</span>}
      </Link>
    );
  }
  return author.href ? (
    <Link href={author.href} className="author">
      {author.name}
    </Link>
  ) : (
    <span className="author">{author.name}</span>
  );
}
