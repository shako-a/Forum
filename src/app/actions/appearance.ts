"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canCustomize } from "@/lib/perks";
import { AppearanceSchema, zodErrors, type FormState } from "@/lib/definitions";
import { PALETTE_IDS, CUSTOM_PALETTE, DEFAULT_PREFS } from "@/lib/appearance";

// Save the caller's own appearance preferences. Reachable by direct POST, so
// it re-checks both auth and the paid gate server-side rather than trusting
// the form to have been hidden.
export async function updateAppearance(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "You must be logged in." };
  if (!canCustomize(user)) return { message: "This is a Supporter feature." };

  const parsed = AppearanceSchema.safeParse({
    themePalette: formData.get("themePalette"),
    themeAccent: formData.get("themeAccent") || undefined,
    themeDensity: formData.get("themeDensity"),
    themeRadius: formData.get("themeRadius"),
    themeDepth: formData.get("themeDepth"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const d = parsed.data;
  const palette = [...PALETTE_IDS, CUSTOM_PALETTE].includes(d.themePalette)
    ? d.themePalette
    : DEFAULT_PREFS.themePalette;

  await db.user.update({
    where: { id: user.id },
    data: {
      themePalette: palette,
      // Only persist a custom colour when the custom palette is selected, so
      // switching back to a preset can't leave a stale accent behind.
      themeAccent: palette === CUSTOM_PALETTE ? (d.themeAccent ?? null) : null,
      themeDensity: d.themeDensity,
      themeRadius: d.themeRadius,
      themeDepth: d.themeDepth,
    },
  });

  // The theme is emitted by <Header>, so every page's markup changes.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
