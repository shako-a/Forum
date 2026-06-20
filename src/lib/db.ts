import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Managed Postgres (e.g. DigitalOcean) serves a cert signed by a private CA
// that isn't in Node's trust store. Prisma 7's pg adapter treats
// `sslmode=require` as verify-full and rejects it. Opt into libpq SSL semantics
// (encrypt, no cert verification) for those connections — traffic stays within
// the provider's network. Local dev uses no TLS, so this is a no-op there.
function resolveConnectionString(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (url && url.includes("sslmode=require") && !url.includes("uselibpqcompat")) {
    return `${url}&uselibpqcompat=true`;
  }
  return url;
}

// Prisma 7 requires an explicit connection — use the pg driver adapter.
const adapter = new PrismaPg({ connectionString: resolveConnectionString() });

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
