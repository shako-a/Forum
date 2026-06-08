import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an explicit connection — use the pg driver adapter.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
