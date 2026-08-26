"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { ACTING_COOKIE } from "@/lib/acting-as";
import { auditEvent } from "@/lib/audit";

// Switch the current session to "act as" a business (or back to self when
// businessId is null). Validated against the user's owned/managed businesses.
export async function setActingAs(businessId: string | null): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const store = await cookies();

  if (!businessId) {
    const previous = store.get(ACTING_COOKIE)?.value ?? null;
    store.delete(ACTING_COOKIE);
    if (previous) {
      await auditEvent({ action: "acting.stop", severity: "notice", model: "Business", targetId: previous, summary: "back to acting as self" });
    }
  } else {
    if (!(await canManageBusiness(user.id, businessId, false))) {
      await auditEvent({
        action: "acting.start",
        severity: "warning",
        outcome: "denied",
        model: "Business",
        targetId: businessId,
        summary: "tried to act as a business they don't manage",
      });
      return;
    }
    store.set(ACTING_COOKIE, businessId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    // Everything posted while the cookie is set is attributed to the business
    // in the UI, so the switch itself has to be on record.
    await auditEvent({ action: "acting.start", severity: "notice", model: "Business", targetId: businessId, summary: "now acting as this business" });
  }
  revalidatePath("/", "layout");
}
