"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canPostIn } from "@/lib/posting-access";
import { defaultLocale, isLocale } from "@/i18n/config";
import { UserJobSchema, zodErrors, type FormState } from "@/lib/definitions";
import { flagGaEvent } from "@/lib/ga-server";

// Jobs posted by members directly (business-owned jobs live in business.ts).

function localeFrom(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}
function safeLocale(locale: string): string {
  return isLocale(locale) ? locale : defaultLocale;
}

function parse(formData: FormData) {
  const opt = (k: string) => formData.get(k) || undefined;
  return UserJobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    companyName: opt("companyName"),
    jobType: formData.get("jobType") ?? undefined,
    pay: opt("pay"),
    city: opt("city"),
    state: opt("state"),
    contactEmail: opt("contactEmail"),
    contactPhone: opt("contactPhone"),
  });
}

async function ownedJob(id: string, user: { id: string; role: string }) {
  const job = await db.jobPosting.findUnique({ where: { id }, select: { id: true, posterId: true } });
  if (!job || !job.posterId) return null; // business jobs are managed elsewhere
  if (job.posterId !== user.id && user.role !== "ADMIN") return null;
  return job;
}

function revalidateJobs(locale: string) {
  revalidatePath(`/${locale}/jobs`, "layout");
}

export async function createUserJob(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!(await canPostIn("jobs", user))) return { message: "Posting jobs isn't included in your plan." };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  await db.jobPosting.create({
    data: {
      posterId: user.id,
      title: d.title,
      description: d.description,
      companyName: d.companyName ?? null,
      jobType: d.jobType ?? null,
      pay: d.pay ?? null,
      city: d.city ?? null,
      state: d.state ?? null,
      contactEmail: d.contactEmail || null,
      contactPhone: d.contactPhone ?? null,
    },
  });
  const locale = localeFrom(formData);
  revalidateJobs(locale);
  await flagGaEvent("job_posted");
  redirect(`/${locale}/jobs/mine`);
}

export async function updateUserJob(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  const job = await ownedJob(String(formData.get("jobId") ?? ""), user);
  if (!job) return { message: "Not allowed." };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  await db.jobPosting.update({
    where: { id: job.id },
    data: {
      title: d.title,
      description: d.description,
      companyName: d.companyName ?? null,
      jobType: d.jobType ?? null,
      pay: d.pay ?? null,
      city: d.city ?? null,
      state: d.state ?? null,
      contactEmail: d.contactEmail || null,
      contactPhone: d.contactPhone ?? null,
      active: formData.get("active") === "on",
    },
  });
  revalidateJobs(localeFrom(formData));
  return { ok: true, message: "Saved." };
}

export async function setUserJobActive(id: string, active: boolean, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const job = await ownedJob(id, user);
  if (!job) return;
  await db.jobPosting.update({ where: { id }, data: { active } });
  revalidateJobs(safeLocale(locale));
}

export async function deleteUserJob(id: string, locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const job = await ownedJob(id, user);
  if (!job) return;
  await db.jobPosting.delete({ where: { id } });
  revalidateJobs(safeLocale(locale));
}
