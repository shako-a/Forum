"use client";

import { useTransition } from "react";
import { setModuleFeatured, reorderModuleFeatured } from "@/app/actions/admin-featured";
import type { FeaturedAdminRow } from "@/lib/featured";
import type { ModuleKey } from "@/lib/modules";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

// One module's featured bar: the current list in display order (↑ ↓ ✕), and
// a search to add more. The page supplies both lists; this only mutates.
export function FeaturedAdmin({
  locale,
  dict,
  module: mod,
  current,
  results,
  q,
}: {
  locale: Locale;
  dict: Dictionary;
  module: ModuleKey;
  current: FeaturedAdminRow[];
  results: FeaturedAdminRow[];
  q: string;
}) {
  const t = dict.admin;
  const [pending, start] = useTransition();

  const move = (i: number, dir: -1 | 1) => {
    const ids = current.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(() => void reorderModuleFeatured(mod, ids));
  };

  return (
    <div>
      <div className="admin-section">
        <h2 className="admin-section-title">★ {t.featuredCurrent}</h2>
        {current.length === 0 ? (
          <p className="muted-sm">{t.featuredEmpty}</p>
        ) : (
          <ol className="admin-banner-list">
            {current.map((r, i) => (
              <li key={r.id}>
                <span className="admin-banner-pos">{i + 1}</span>
                <a href={`/${locale}${r.href}`} target="_blank" rel="noreferrer" className="admin-link">{r.title}</a>
                <span className="muted-sm">{r.subtitle}{!r.live && ` · ${t.featuredHidden}`}</span>
                <span className="admin-banner-tools">
                  <button type="button" className="action" disabled={pending || i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="action" disabled={pending || i === current.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button type="button" className="action mod-action" disabled={pending} title={t.featuredRemove} onClick={() => start(() => void setModuleFeatured(mod, r.id, false))}>✕</button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="admin-section">
        <form method="get" className="admin-filter-row">
          <input type="hidden" name="tab" value={mod} />
          <input className="input" name="q" placeholder={t.featuredSearch} defaultValue={q} />
          <button type="submit" className="btn btn-ghost btn-sm">{dict.business.search}</button>
        </form>
        {q && (
          <>
            <h2 className="admin-section-title">{t.featuredResults}</h2>
            {results.length === 0 ? (
              <p className="muted-sm">{dict.admin.empty}</p>
            ) : (
              <ul className="admin-banner-list">
                {results.map((r) => (
                  <li key={r.id}>
                    <a href={`/${locale}${r.href}`} target="_blank" rel="noreferrer" className="admin-link">{r.title}</a>
                    <span className="muted-sm">{r.subtitle}{!r.live && ` · ${t.featuredHidden}`}</span>
                    <span className="admin-banner-tools">
                      {r.featured ? (
                        <span className="muted-sm">★</span>
                      ) : (
                        <button type="button" className="action" disabled={pending} onClick={() => start(() => void setModuleFeatured(mod, r.id, true))}>
                          ★ {t.featuredAdd}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
