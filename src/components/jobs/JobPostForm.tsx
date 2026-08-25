"use client";

import { useActionState } from "react";
import { createUserJob, updateUserJob } from "@/app/actions/jobs";
import { StateSelect } from "@/components/StateSelect";
import { JOB_TYPES } from "@/lib/jobs";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export type JobPostValues = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  jobType: string;
  pay: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  active: boolean;
};

export function JobPostForm({
  locale,
  dict,
  mode,
  values,
  prefillEmail,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: "create" | "edit";
  values?: Partial<JobPostValues>;
  prefillEmail?: string;
}) {
  const t = dict.business;
  const [state, action, pending] = useActionState(mode === "create" ? createUserJob : updateUserJob, undefined);
  const err = state?.errors;

  return (
    <form action={action} className="card card-pad account-form">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && <input type="hidden" name="jobId" value={values?.id ?? ""} />}
      {state?.ok && <p className="auth-ok" role="status">✓ {dict.profile.saved}</p>}
      {state?.message && !state.ok && <p className="auth-alert" role="alert">{state.message}</p>}

      <div className="field">
        <label htmlFor="title">{t.jobTitle}<span className="req">*</span></label>
        <input id="title" name="title" className="input" defaultValue={values?.title} required maxLength={120} aria-invalid={err?.title ? true : undefined} />
        {err?.title && <span className="field-error">{err.title.join(" ")}</span>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="companyName">{t.jobCompany}</label>
          <input id="companyName" name="companyName" className="input" defaultValue={values?.companyName} maxLength={120} placeholder={t.jobCompanyPlaceholder} />
        </div>
        <div className="field">
          <label htmlFor="jobType">{t.jobType}</label>
          <select id="jobType" name="jobType" className="input" defaultValue={values?.jobType ?? ""}>
            <option value="">—</option>
            {JOB_TYPES.map((j) => (
              <option key={j.key} value={j.key}>{j.icon} {locale === "ka" ? j.ka : j.en}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pay">{t.jobPay}</label>
        <input id="pay" name="pay" className="input" defaultValue={values?.pay} maxLength={60} placeholder={t.jobPayPlaceholder} />
      </div>
      <div className="field">
        <label htmlFor="description">{t.jobDescription}<span className="req">*</span></label>
        <textarea id="description" name="description" className="input" rows={7} defaultValue={values?.description} required maxLength={6000} placeholder={t.jobDescriptionPlaceholder} aria-invalid={err?.description ? true : undefined} />
        {err?.description && <span className="field-error">{err.description.join(" ")}</span>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="city">{dict.auth.city}</label>
          <input id="city" name="city" className="input" defaultValue={values?.city} maxLength={80} />
        </div>
        <StateSelect
          name="state"
          label={dict.auth.state}
          locale={locale}
          required={false}
          defaultValue={values?.state ?? ""}
          usGroupLabel={dict.auth.usStates}
          geolocate={mode === "create"}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="contactEmail">{t.jobContactEmail}</label>
          <input id="contactEmail" name="contactEmail" type="email" className="input" defaultValue={values?.contactEmail ?? prefillEmail} aria-invalid={err?.contactEmail ? true : undefined} />
          {err?.contactEmail && <span className="field-error">{err.contactEmail.join(" ")}</span>}
        </div>
        <div className="field">
          <label htmlFor="contactPhone">{t.jobContactPhone}</label>
          <input id="contactPhone" name="contactPhone" type="tel" className="input" defaultValue={values?.contactPhone} maxLength={40} />
        </div>
      </div>
      <p className="muted-sm">{t.jobContactHint}</p>
      {mode === "edit" && (
        <label className="re-active-check">
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          <span>{t.jobActive}</span>
        </label>
      )}
      <div className="account-actions">
        <button type="submit" disabled={pending} className="btn btn-primary">{mode === "create" ? t.postJob : dict.profile.save}</button>
      </div>
    </form>
  );
}
