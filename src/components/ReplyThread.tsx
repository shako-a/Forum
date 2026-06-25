import { timeAgo } from "@/lib/format";
import { ReplyActions } from "@/components/ReplyActions";
import { CollapsibleChildren } from "@/components/CollapsibleChildren";
import { AuthorTag } from "@/components/AuthorTag";
import type { AliasOption } from "@/components/IdentityPicker";
import type { ThreadReply } from "@/lib/forum-data";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Common = {
  locale: Locale;
  slug: string;
  postId: string;
  dict: Dictionary;
  canVote: boolean;
  canReply: boolean;
  canModerate: boolean;
  loginHref: string;
  shareTitle: string;
  realName: string;
  aliases: AliasOption[];
};

function ReplyNode({ node, common }: { node: ThreadReply; common: Common }) {
  const { locale, slug, postId, dict, canVote, canReply, canModerate, loginHref, shareTitle, realName, aliases } =
    common;

  // Tombstone for author-deleted replies that still have a sub-thread.
  if (node.deleted) {
    return (
      <div className="reply" id={`r-${node.id}`}>
        <div className="reply-head">
          <span className="deleted-tag">{dict.post.deletedTag}</span>
          <span className="sep">·</span>
          {timeAgo(node.createdAt, locale)}
        </div>
        {node.children.length > 0 && (
          <CollapsibleChildren count={node.children.length} dict={dict}>
            {node.children.map((child) => (
              <ReplyNode key={child.id} node={child} common={common} />
            ))}
          </CollapsibleChildren>
        )}
      </div>
    );
  }

  return (
    <div className="reply" id={`r-${node.id}`}>
      <div className="reply-head">
        <AuthorTag author={node.author} />
        <span className="sep">·</span>
        {timeAgo(node.createdAt, locale)}
        {node.hidden && <span className="hidden-tag">({dict.admin.hiddenContent})</span>}
      </div>
      <div className="prose reply-body" dangerouslySetInnerHTML={{ __html: node.bodyHtml }} />
      <ReplyActions
        replyId={node.id}
        locale={locale}
        slug={slug}
        postId={postId}
        score={node.score}
        myVote={node.myVote}
        canVote={canVote}
        canReply={canReply}
        canEdit={node.isOwn || canModerate}
        canModerate={canModerate}
        hidden={node.hidden}
        editText={node.editableText}
        editImage={node.imageUrl}
        loginHref={loginHref}
        shareTitle={shareTitle}
        dict={dict}
        realName={realName}
        aliases={aliases}
      />
      {node.children.length > 0 && (
        <CollapsibleChildren count={node.children.length} dict={dict}>
          {node.children.map((child) => (
            <ReplyNode key={child.id} node={child} common={common} />
          ))}
        </CollapsibleChildren>
      )}
    </div>
  );
}

export function ReplyThread({ roots, ...common }: { roots: ThreadReply[] } & Common) {
  if (roots.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 14 }}>{common.dict.post.noReplies}</p>;
  }
  return (
    <>
      {roots.map((node) => (
        <ReplyNode key={node.id} node={node} common={common} />
      ))}
    </>
  );
}
