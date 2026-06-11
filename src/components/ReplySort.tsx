"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionaries";

export type ReplySortKey = "best" | "new" | "old";

export function ReplySort({ current, dict }: { current: ReplySortKey; dict: Dictionary }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const sort = e.target.value;
    const sp = new URLSearchParams(params.toString());
    if (sort === "best") sp.delete("sort");
    else sp.set("sort", sort);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}#replies` : `${pathname}#replies`, { scroll: false });
  }

  return (
    <label className="reply-sort">
      {dict.post.sortBy}
      <select value={current} onChange={change}>
        <option value="best">{dict.post.sortBest}</option>
        <option value="new">{dict.post.sortNew}</option>
        <option value="old">{dict.post.sortOld}</option>
      </select>
    </label>
  );
}
