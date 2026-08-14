"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { AiPackageSchema, zodErrors, type FormState } from "@/lib/definitions";

// Admin tuning for the AI allowances. Admin-only; the numbers directly bound
// the Anthropic bill, so this is not delegated to moderators.
export async function updateAiPackage(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return { message: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing package." };

  const tier = String(formData.get("tier") ?? "");
  const parsed = AiPackageSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameKa: formData.get("nameKa"),
    tier: tier === "" ? undefined : tier,
    isActive: formData.get("isActive") === "on",
    monthlyBudgetMicroUsd: formData.get("monthlyBudgetMicroUsd"),
    rolloverPercent: formData.get("rolloverPercent"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;

  // A tier can only feed one package, otherwise resolvePackage would pick
  // arbitrarily between them. Clear the mapping from any other package first.
  if (d.tier) {
    await db.aiPackage.updateMany({
      where: { tier: d.tier, NOT: { id } },
      data: { tier: null },
    });
  }

  await db.aiPackage.update({
    where: { id },
    data: {
      nameEn: d.nameEn,
      nameKa: d.nameKa,
      tier: d.tier ?? null,
      isActive: d.isActive ?? false,
      monthlyBudgetMicroUsd: d.monthlyBudgetMicroUsd,
      rolloverPercent: d.rolloverPercent,
    },
  });

  revalidatePath("/[lang]/admin/ai-usage", "page");
  return { ok: true, message: "Saved." };
}
