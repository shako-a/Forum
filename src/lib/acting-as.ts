import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { canManageBusiness } from "@/lib/business-manage";

export const ACTING_COOKIE = "acting_as";

export type ActingBusiness = { id: string; name: string; slug: string; logoUrl: string | null };

// The business the current user is "acting as" (from the acting_as cookie), or
// null when acting as themselves. Re-validates management rights on every read
// so a revoked manager immediately stops acting as the business. Memoized per
// request.
export const getActingBusiness = cache(async (): Promise<ActingBusiness | null> => {
  const store = await cookies();
  const businessId = store.get(ACTING_COOKIE)?.value;
  if (!businessId) return null;

  const user = await getCurrentUser();
  if (!user) return null;
  // isAdmin=false on purpose: acting-as is limited to owned/managed businesses.
  if (!(await canManageBusiness(user.id, businessId, false))) return null;

  return db.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
});
