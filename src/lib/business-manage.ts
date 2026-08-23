import "server-only";
import { db } from "@/lib/db";

// Can this user manage the business? Owner, a delegated manager, or (when
// isAdmin) any admin. Pass isAdmin only for moderation-style contexts (edit /
// delete); the "act as" flow deliberately passes false so admins can't act as
// businesses they don't own or manage.
export async function canManageBusiness(
  userId: string,
  businessId: string,
  isAdmin = false,
): Promise<boolean> {
  if (isAdmin) return true;
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true },
  });
  if (!biz) return false;
  if (biz.ownerId === userId) return true;
  const mgr = await db.businessManager.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: { userId: true },
  });
  return !!mgr;
}

export type ManageableBusiness = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: "owner" | "manager";
};

// Businesses a user owns or manages — for the "acting as" switcher and the
// identity picker. Owned businesses win over managed if both somehow exist.
export async function getManageableBusinesses(userId: string): Promise<ManageableBusiness[]> {
  const [owned, managed] = await Promise.all([
    db.business.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { name: "asc" },
    }),
    db.businessManager.findMany({
      where: { userId },
      select: { business: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      orderBy: { business: { name: "asc" } },
    }),
  ]);
  const map = new Map<string, ManageableBusiness>();
  for (const b of owned) map.set(b.id, { ...b, role: "owner" });
  for (const m of managed) {
    if (!map.has(m.business.id)) map.set(m.business.id, { ...m.business, role: "manager" });
  }
  return [...map.values()];
}
