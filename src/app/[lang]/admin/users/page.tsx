import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUser, requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { UserAdmin, type AdminUser } from "@/components/admin/UserAdmin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

export default async function AdminUsersPage({ params, searchParams }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireRole(lang, "ADMIN"); // user management is admin-only (prevents self-promotion)
  const dict = await getDictionary(lang);

  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  // Searching the database, not the loaded page: only PAGE_SIZE rows are ever
  // rendered, so a client-side filter would quietly fail to find anyone who
  // isn't among the most recent signups. Id matches by prefix, because that is
  // what the table shows — IdCell renders the first 8 characters — while a full
  // id pasted from the audit log still matches.
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { forumName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { id: { startsWith: q } },
        ],
      }
    : {};

  const [me, users, total] = await Promise.all([
    getCurrentUser(),
    db.user
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, forumName: true, email: true, role: true, status: true,
          isDonor: true, isPro: true, isSupporter: true, canAccessAdmin: true,
          aiAsk: true, aiTranslate: true,
          // Feature keys come from packages the user holds; the AI columns need
          // them to tell a direct grant apart from one a plan already gives.
          packages: { select: { package: { select: { features: { where: { included: true }, select: { feature: { select: { key: true } } } } } } } },
        },
        take: PAGE_SIZE,
      })
      .catch(() => []),
    db.user.count({ where }).catch(() => 0),
  ]);

  const rows: AdminUser[] = users.map((u) => {
    const { packages, ...rest } = u;
    return {
      ...rest,
      featureKeys: [
        ...new Set(packages.flatMap((p) => p.package.features.map((f) => f.feature.key))),
      ],
    };
  });

  return (
    <UserAdmin
      dict={dict}
      users={rows}
      currentUserId={me?.id ?? ""}
      locale={lang}
      q={q}
      total={total}
    />
  );
}
