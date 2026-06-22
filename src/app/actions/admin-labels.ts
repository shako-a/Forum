"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { LabelSchema, zodErrors, type FormState } from "@/lib/definitions";

// Labels are admin-only. CRUD for the custom user badges.

function parseLabel(formData: FormData) {
  return LabelSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameKa: formData.get("nameKa"),
    color: formData.get("color") || undefined,
    background: formData.get("background") || undefined,
    font: formData.get("font") || undefined,
    bold: formData.get("bold") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

function dataFrom(parsed: ReturnType<typeof LabelSchema.safeParse>) {
  if (!parsed.success) return null;
  const { color, background, font, bold, sortOrder, ...names } = parsed.data;
  return {
    ...names,
    color: color ?? "#1f4e9c",
    background: background ?? "#eaf1fb",
    font: font ?? "body",
    bold: bold ?? true,
    sortOrder: sortOrder ?? 0,
  };
}

export async function createLabel(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "You do not have permission to do this." };
  const parsed = parseLabel(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  await db.label.create({ data: dataFrom(parsed)! });
  revalidatePath("/[lang]/admin/labels", "page");
  return { ok: true };
}

export async function updateLabel(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "You do not have permission to do this." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing label." };
  const parsed = parseLabel(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  await db.label.update({ where: { id }, data: dataFrom(parsed)! });
  revalidatePath("/[lang]/admin/labels", "page");
  return { ok: true };
}

export async function deleteLabel(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.label.delete({ where: { id } }); // M2M rows are removed automatically
  revalidatePath("/[lang]/admin/labels", "page");
}
