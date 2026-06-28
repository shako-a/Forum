"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setPopularBarSize, setFeaturedInBar } from "@/app/actions/admin-popular";
import { categoryName } from "@/i18n/localize";
import { categoryStyle } from "@/lib/category-style";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type BarPost = {
  id: string;
  slug: string;
  title: string;
  category: { slug: string; nameEn: string; nameKa: string };
  score: number;
  comments: number;
  featured: boolean;
};

function PostRow({ p, locale, dict }: { p: BarPost; locale: Locale; dict: Dictionary }) {
  const t = dict.admin;
  const [pending, startTransition] = useTransition();
  const style = categoryStyle(p.category.slug);
  return (
    <li className="bar-row">
      <button
        type="button"
        className={`bar-pin${p.featured ? " on" : ""}`}
        disabled={pending}
        title={p.featured ? t.pinned : t.pinToBar}
        onClick={() => startTransition(() => void setFeaturedInBar(p.id, !p.featured))}
      >
        {p.featured ? "★" : "☆"}
      </button>
      <div className="bar-row-main">
        <Link href={`/${locale}/p/${p.slug}`} className="bar-row-title" target="_blank">
          {p.title}
        </Link>
        <div className="bar-row-meta">
          <span className="dot" style={{ background: style.color }} />
          {categoryName(p.category, locale)}
          <span className="sep">·</span>▲ {p.score}
          <span className="sep">·</span>💬 {p.comments}
        </div>
      </div>
    </li>
  );
}

export function PopularAdmin({
  locale,
  dict,
  barSize,
  pinnedCount,
  mostVoted,
  mostCommented,
}: {
  locale: Locale;
  dict: Dictionary;
  barSize: number;
  pinnedCount: number;
  mostVoted: BarPost[];
  mostCommented: BarPost[];
}) {
  const t = dict.admin;
  const [size, setSize] = useState(String(barSize));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      await setPopularBarSize(Number(size));
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="admin-h1">{t.postManagement}</h1>

      {/* Bar size */}
      <div className="card card-pad">
        <label htmlFor="barSize" className="bar-size-label">
          {t.barSize}
        </label>
        <p className="muted-sm" style={{ marginBottom: 8 }}>{t.barSizeHint}</p>
        <div className="bar-size-row">
          <input
            id="barSize"
            type="number"
            min={1}
            max={20}
            className="input bar-size-input"
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              setSaved(false);
            }}
          />
          <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
            {t.save}
          </button>
          {saved && <span className="auth-ok">✓ {t.saved}</span>}
        </div>
      </div>

      <p className="muted-sm">
        {pinnedCount > 0 ? t.curationOn.replace("{n}", String(pinnedCount)) : t.curationOff}
      </p>

      <div className="bar-lists">
        <div className="card card-pad">
          <h2 className="bar-list-title">▲ {t.mostVoted}</h2>
          <ul className="bar-list">
            {mostVoted.map((p) => (
              <PostRow key={p.id} p={p} locale={locale} dict={dict} />
            ))}
            {mostVoted.length === 0 && <li className="muted-sm">{t.empty}</li>}
          </ul>
        </div>
        <div className="card card-pad">
          <h2 className="bar-list-title">💬 {t.mostCommented}</h2>
          <ul className="bar-list">
            {mostCommented.map((p) => (
              <PostRow key={p.id} p={p} locale={locale} dict={dict} />
            ))}
            {mostCommented.length === 0 && <li className="muted-sm">{t.empty}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
