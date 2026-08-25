"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setJobActive, removeJob } from "@/app/actions/admin-business";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type AdminJob = {
  id: string;
  title: string;
  location: string;
  active: boolean;
  business: { slug: string; name: string } | null;
  poster: { id: string; forumName: string } | null;
  companyName: string | null;
};

function Row({ j, locale, dict }: { j: AdminJob; locale: Locale; dict: Dictionary }) {
  const t = dict.admin;
  const tb = dict.business;
  const [pending, startTransition] = useTransition();
  return (
    <tr className={j.active ? "" : "opacity-50"}>
      <td>
        <strong>{j.title}</strong>
        {j.location && <div className="muted-sm">📍 {j.location}</div>}
      </td>
      <td>
        {j.business ? (
          <Link href={`/${locale}/business/${j.business.slug}`} className="admin-user-link">
            {j.business.name}
          </Link>
        ) : (
          <>
            {j.companyName && <div>{j.companyName}</div>}
            {j.poster && (
              <Link href={`/${locale}/admin/users/${j.poster.id}`} className="admin-user-link">
                👤 {j.poster.forumName}
              </Link>
            )}
          </>
        )}
      </td>
      <td>
        <button
          type="button"
          className="action"
          disabled={pending}
          onClick={() => startTransition(() => void setJobActive(j.id, !j.active))}
        >
          {j.active ? "✓ " + t.active : "— " + t.active}
        </button>
      </td>
      <td style={{ textAlign: "right" }}>
        <button
          type="button"
          className="action mod-action"
          disabled={pending}
          onClick={() => {
            if (window.confirm(tb.confirmDeleteJob)) startTransition(() => void removeJob(j.id));
          }}
        >
          {t.delete}
        </button>
      </td>
    </tr>
  );
}

export function JobsAdmin({
  locale,
  dict,
  jobs,
}: {
  locale: Locale;
  dict: Dictionary;
  jobs: AdminJob[];
}) {
  const t = dict.admin;
  const tb = dict.business;
  return (
    <div>
      <h1 className="admin-h1">{tb.jobs}</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{tb.jobTitle}</th>
            <th>{tb.name}</th>
            <th>{t.status}</th>
            <th style={{ textAlign: "right" }}>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <Row key={j.id} j={j} locale={locale} dict={dict} />
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                {tb.noJobs}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
