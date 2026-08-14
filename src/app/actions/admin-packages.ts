"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/dal";
import { zodErrors, PackageSchema, FeatureSchema, type FormState } from "@/lib/definitions";

// Admin CRUD for the paid packages shown on "მეტი" and the shared perk
// catalogue. Admin-only throughout.

const DENIED = { message: "You do not have permission to do this." };

// Public pages read packages on every request, and the admin screens are their
// own routes — revalidate all of them after any change.
function revalidateAll() {
  revalidatePath("/[lang]/more", "page");
  revalidatePath("/[lang]/more/[slug]", "page");
  revalidatePath("/[lang]/admin/more", "page");
  revalidatePath("/[lang]/admin/more/[id]", "page");
}

// A URL-safe slug. Falls back to a stable generated one so a package can never
// end up with an empty or duplicate-prone path.
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || `package-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePackage(formData: FormData) {
  const discountType = String(formData.get("discountType") ?? "");
  return PackageSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameKa: formData.get("nameKa"),
    blurbEn: formData.get("blurbEn"),
    blurbKa: formData.get("blurbKa"),
    pitchEn: formData.get("pitchEn"),
    pitchKa: formData.get("pitchKa"),
    icon: formData.get("icon") || undefined,
    accent: formData.get("accent") || undefined,
    priceCents: formData.get("priceCents"),
    discountType: discountType === "" ? undefined : discountType,
    discountPercent: formData.get("discountPercent") || undefined,
    discountPriceCents: formData.get("discountPriceCents") || undefined,
    discountStartsAt: formData.get("discountStartsAt") || undefined,
    discountEndsAt: formData.get("discountEndsAt") || undefined,
    isActive: formData.get("isActive") === "on",
    featured: formData.get("featured") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

type PackageInput = NonNullable<ReturnType<typeof parsePackage>["data"]>;

function packageData(d: PackageInput) {
  // Only keep the discount fields that belong to the chosen type, so switching
  // from percent to fixed can't leave a stale percentage behind.
  const isPercent = d.discountType === "PERCENT";
  const isFixed = d.discountType === "FIXED";
  return {
    nameEn: d.nameEn,
    nameKa: d.nameKa,
    blurbEn: d.blurbEn,
    blurbKa: d.blurbKa,
    pitchEn: d.pitchEn,
    pitchKa: d.pitchKa,
    icon: d.icon ?? "✦",
    accent: d.accent ?? "#1f4e9c",
    priceCents: d.priceCents,
    discountType: d.discountType ?? null,
    discountPercent: isPercent ? (d.discountPercent ?? null) : null,
    discountPriceCents: isFixed ? (d.discountPriceCents ?? null) : null,
    discountStartsAt: d.discountType ? (d.discountStartsAt ?? null) : null,
    discountEndsAt: d.discountType ? (d.discountEndsAt ?? null) : null,
    isActive: d.isActive ?? true,
    featured: d.featured ?? false,
    sortOrder: d.sortOrder ?? 0,
  };
}

// The perk list arrives as two parallel sets of checkboxes: which features the
// package lists at all, and which of those are shown as *excluded*.
async function saveFeatures(packageId: string, formData: FormData) {
  const listed = formData.getAll("featureIds").map(String);
  const excluded = new Set(formData.getAll("excludedIds").map(String));

  await db.packageFeature.deleteMany({ where: { packageId } });
  if (listed.length === 0) return;
  await db.packageFeature.createMany({
    data: listed.map((featureId, i) => ({
      packageId,
      featureId,
      included: !excluded.has(featureId),
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
}

export async function createPackage(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return DENIED;
  const parsed = parsePackage(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const wanted = slugify(String(formData.get("slug") || parsed.data.nameEn));
  // Slug and key are unique; suffix on collision rather than failing the save.
  const taken = await db.paidPackage.findFirst({ where: { slug: wanted }, select: { id: true } });
  const slug = taken ? `${wanted}-${Math.random().toString(36).slice(2, 6)}` : wanted;

  const pkg = await db.paidPackage.create({
    data: {
      ...packageData(parsed.data),
      slug,
      key: `PKG_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
      isBuiltIn: false,
    },
  });
  await saveFeatures(pkg.id, formData);

  revalidateAll();
  return { ok: true, message: "Created." };
}

export async function updatePackage(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return DENIED;
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing package." };
  const parsed = parsePackage(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };

  const existing = await db.paidPackage.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { message: "Package not found." };

  // The slug is the public URL, so only change it when the admin actually
  // edited the field, and never onto one another package already uses.
  const requested = slugify(String(formData.get("slug") || existing.slug));
  const clash =
    requested !== existing.slug &&
    (await db.paidPackage.findFirst({ where: { slug: requested }, select: { id: true } }));

  await db.paidPackage.update({
    where: { id },
    data: { ...packageData(parsed.data), slug: clash ? existing.slug : requested },
  });
  await saveFeatures(id, formData);

  revalidateAll();
  return { ok: true, message: clash ? "Saved (slug was already taken)." : "Saved." };
}

export async function setPackageActive(id: string, isActive: boolean): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.paidPackage.update({ where: { id }, data: { isActive } });
  revalidateAll();
}

export async function deletePackage(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  // Built-ins back the long-standing Donor/Pro/Supporter flags and the header's
  // upsell links — deactivate them instead of deleting.
  const pkg = await db.paidPackage.findUnique({ where: { id }, select: { isBuiltIn: true } });
  if (!pkg || pkg.isBuiltIn) return;
  await db.paidPackage.delete({ where: { id } });
  revalidateAll();
}

/** Move a package one place up or down in the display order. */
export async function movePackage(id: string, direction: "up" | "down"): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const all = await db.paidPackage.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const i = all.findIndex((p) => p.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;

  // Rewrite the whole order so pre-existing duplicate/equal sortOrders (which
  // would otherwise make swapping a no-op) get normalised as a side effect.
  const reordered = [...all];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await db.$transaction(
    reordered.map((p, idx) =>
      db.paidPackage.update({ where: { id: p.id }, data: { sortOrder: idx } }),
    ),
  );
  revalidateAll();
}

// --- perk catalogue ---------------------------------------------------------

function parseFeature(formData: FormData) {
  return FeatureSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameKa: formData.get("nameKa"),
    key: formData.get("key") || undefined,
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

export async function createFeature(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return DENIED;
  const parsed = parseFeature(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { key, nameEn, isActive, sortOrder, ...rest } = parsed.data;

  // The key is what gating looks up (e.g. "askAi"), so it must be unique and
  // stable; derive one from the English name when the admin leaves it blank.
  const wanted = (key || slugify(nameEn).replace(/-(.)/g, (_, c: string) => c.toUpperCase())) || "feature";
  const taken = await db.feature.findUnique({ where: { key: wanted }, select: { id: true } });

  const last = await db.feature.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await db.feature.create({
    data: {
      ...rest,
      nameEn,
      key: taken ? `${wanted}${Math.random().toString(36).slice(2, 5)}` : wanted,
      isActive: isActive ?? true,
      // Append rather than default to 0, which would put every new perk at the
      // top of the catalogue — and therefore of every public card.
      sortOrder: sortOrder ?? (last ? last.sortOrder + 1 : 0),
    },
  });
  revalidateAll();
  return { ok: true, message: "Created." };
}

export async function updateFeature(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await authorize("ADMIN"))) return DENIED;
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing feature." };
  const parsed = parseFeature(formData);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { key, isActive, sortOrder, ...rest } = parsed.data;

  // Changing a key would silently break gating that references it, so the key
  // is fixed after creation.
  await db.feature.update({
    where: { id },
    data: { ...rest, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
  });
  revalidateAll();
  return { ok: true, message: "Saved." };
}

export async function setFeatureActive(id: string, isActive: boolean): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  await db.feature.update({ where: { id }, data: { isActive } });
  revalidateAll();
}

export async function deleteFeature(id: string): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  // Cascade removes it from every package that listed it.
  await db.feature.delete({ where: { id } });
  revalidateAll();
}

/**
 * Grant or revoke an admin-created package for a user.
 *
 * The three built-in packages are carried by User.isDonor/isPro/isSupporter and
 * have their own toggles, so this only handles the ones an admin invented —
 * otherwise a package could be held twice, by two different mechanisms.
 */
export async function setUserPackage(
  userId: string,
  packageId: string,
  held: boolean,
): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const pkg = await db.paidPackage.findUnique({
    where: { id: packageId },
    select: { isBuiltIn: true },
  });
  if (!pkg || pkg.isBuiltIn) return;

  if (held) {
    await db.userPackage.upsert({
      where: { userId_packageId: { userId, packageId } },
      update: {},
      create: { userId, packageId },
    });
  } else {
    await db.userPackage.deleteMany({ where: { userId, packageId } });
  }
  revalidatePath("/[lang]/admin/users", "page");
  revalidatePath("/[lang]/admin/users/[id]", "page");
}

/**
 * Move a perk one place up or down in the catalogue.
 *
 * The catalogue order drives the order perks appear on the public package
 * cards (see toPublic in lib/packages.ts), so this is the single control for
 * public presentation rather than an admin-only convenience.
 */
export async function moveFeature(id: string, direction: "up" | "down"): Promise<void> {
  if (!(await authorize("ADMIN"))) return;
  const all = await db.feature.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const i = all.findIndex((f) => f.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;

  // Rewrite the whole order so any pre-existing duplicate sortOrders (which
  // would make a swap a silent no-op) get normalised along the way.
  const reordered = [...all];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await db.$transaction(
    reordered.map((f, idx) => db.feature.update({ where: { id: f.id }, data: { sortOrder: idx } })),
  );
  revalidateAll();
}
