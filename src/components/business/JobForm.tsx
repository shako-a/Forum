"use client";

import { useActionState, useRef } from "react";
import { RichDescriptionField } from "@/components/RichDescriptionField";
import { addJob } from "@/app/actions/business";
import { JOB_CATEGORIES } from "@/lib/jobs";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function JobForm({
  locale,
  dict,
  businessId,
}: {
  locale: Locale;
  dict: Dictionary;
  businessId: string;
}) {
  const t = dict.business;
  const [state, action, pending] = useActionState(addJob, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  if (state?.ok) formRef.current?.reset();

  return (
    <form action={action} ref={formRef} className="job-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="businessId" value={businessId} />

      <input name="title" className="input" placeholder={t.jobTitle} aria-invalid={state?.errors?.title ? true : undefined} />
      {state?.errors?.title && <span className="field-error">{state.errors.title.join(" ")}</span>}
      <RichDescriptionField dict={dict} placeholder={t.jobDescription} />
      {state?.errors?.description && <span className="field-error">{state.errors.description.join(" ")}</span>}
      <select name="category" className="input" defaultValue="" aria-label={t.jobCategory}>
        <option value="">{t.jobCategory}: —</option>
        {JOB_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.icon} {locale === "ka" ? c.ka : c.en}</option>
        ))}
      </select>
      <div className="field-row">
        <input name="city" className="input" placeholder={dict.auth.city} />
        <input name="state" className="input" placeholder={dict.auth.state} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{t.addJob}</button>
    </form>
  );
}
