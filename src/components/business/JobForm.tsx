"use client";

import { useActionState, useRef } from "react";
import { addJob } from "@/app/actions/business";
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
      <textarea name="description" className="input" rows={3} placeholder={t.jobDescription} />
      {state?.errors?.description && <span className="field-error">{state.errors.description.join(" ")}</span>}
      <div className="field-row">
        <input name="city" className="input" placeholder={dict.auth.city} />
        <input name="state" className="input" placeholder={dict.auth.state} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{t.addJob}</button>
    </form>
  );
}
