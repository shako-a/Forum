import { PrismaClient } from "@/generated/prisma/client";
import { createPgAdapter } from "@/lib/pg-adapter";
import { auditExtension, setAuditClient } from "@/lib/audit";

// Prisma 7 requires an explicit connection — use the pg driver adapter
// (SSL handling for managed Postgres lives in createPgAdapter).
const adapter = createPgAdapter();

type Db = ReturnType<typeof extend>;

function extend(base: PrismaClient) {
  return base.$extends(auditExtension());
}

// Both clients are kept on globalThis: the un-extended one so the activity
// log can read rows before a write and insert its own entries without being
// intercepted, and the extended one that the app uses. Reusing them across
// hot reloads avoids exhausting database connections; keeping them global also
// means every module graph Next builds (pages, server actions, route handlers)
// shares one instance.
const g = globalThis as unknown as { prismaBase?: PrismaClient; prisma?: Db };

const base =
  g.prismaBase ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Registered on every evaluation of this module, not only when the client is
// first built — a re-evaluated copy that picked the client up from globalThis
// must still be able to write audit entries.
setAuditClient(base);

// Every write through `db` is recorded in AuditLog (see src/lib/audit.ts).
export const db: Db = g.prisma ?? extend(base);

if (process.env.NODE_ENV !== "production") {
  g.prismaBase = base;
  g.prisma = db;
}
