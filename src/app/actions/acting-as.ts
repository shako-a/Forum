"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";
import { ACTING_COOKIE } from "@/lib/acting-as";

// Switch the current session to "act as" a business (or back to self when
// businessId is null). Validated against the user's owned/managed businesses.
export async function setActingAs(businessId: string | null): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const store = await cookies();

  if (!businessId) {
    store.delete(ACTING_COOKIE);
  } else {
    if (!(await canManageBusiness(user.id, businessId, false))) return;
    store.set(ACTING_COOKIE, businessId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  revalidatePath("/", "layout");
}
