"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { isModuleKey, type ModuleKey } from "@/lib/modules";

// Admin → Featured: which listings sit in each module's featured bar, and in
// what order. One pair of actions for all five modules.

type FeaturedData = { featured: boolean; featuredOrder: number };

async function write(module: ModuleKey, id: string, data: FeaturedData): Promise<void> {
  switch (module) {
    case "business": await db.business.update({ where: { id }, data }); return;
    case "jobs": await db.jobPosting.update({ where: { id }, data }); return;
    case "estate": await db.propertyListing.update({ where: { id }, data }); return;
    case "market": await db.marketListing.update({ where: { id }, data }); return;
    case "auto": await db.autoListing.update({ where: { id }, data }); return;
  }
}

async function nextOrder(module: ModuleKey): Promise<number> {
  const where = { featured: true };
  const agg = { _max: { featuredOrder: true as const } };
  const r =
    module === "business" ? await db.business.aggregate({ where, ...agg })
    : module === "jobs" ? await db.jobPosting.aggregate({ where, ...agg })
    : module === "estate" ? await db.propertyListing.aggregate({ where, ...agg })
    : module === "market" ? await db.marketListing.aggregate({ where, ...agg })
    : await db.autoListing.aggregate({ where, ...agg });
  return (r._max.featuredOrder ?? 0) + 1;
}

function done() {
  revalidatePath("/[lang]/admin/featured", "page");
}

export async function setModuleFeatured(module: ModuleKey, id: string, on: boolean): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor || !isModuleKey(module) || !id) return;
  // New entries go to the end; removed ones give up their slot.
  await write(module, id, on ? { featured: true, featuredOrder: await nextOrder(module) } : { featured: false, featuredOrder: 0 });
  done();
}

export async function reorderModuleFeatured(module: ModuleKey, ids: string[]): Promise<void> {
  const actor = await authorize("ADMIN");
  if (!actor || !isModuleKey(module)) return;
  const list = ids.slice(0, 50).map(String);
  for (const [i, id] of list.entries()) await write(module, id, { featured: true, featuredOrder: i + 1 });
  done();
}
