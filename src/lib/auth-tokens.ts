import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { AuthTokenType } from "@/generated/prisma/client";

// Single-use tokens for password reset and email verification.
//
// The raw token travels only in the emailed link; the database stores just its
// SHA-256 hash, so a DB leak yields nothing usable. Tokens are single-use
// (deleted when consumed) and time-limited.

const TTL_MS: Record<AuthTokenType, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour — short, it's a sensitive action
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24 hours — less sensitive, allow for delays
};

// Don't let someone spam a mailbox by hammering the form: refuse a new token
// if a fresh one for the same user+type was issued in the last two minutes.
const REISSUE_THROTTLE_MS = 2 * 60 * 1000;

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a token for `userId`. Returns the raw token to embed in a link, or
 * null when throttled (a recent one already exists — reuse the email you got).
 * Clears older tokens of the same type so only the newest link works.
 */
export async function issueToken(
  userId: string,
  type: AuthTokenType,
): Promise<string | null> {
  const recent = await db.authToken.findFirst({
    where: { userId, type, createdAt: { gt: new Date(Date.now() - REISSUE_THROTTLE_MS) } },
    select: { id: true },
  });
  if (recent) return null;

  await db.authToken.deleteMany({ where: { userId, type } });

  const raw = randomBytes(32).toString("hex");
  await db.authToken.create({
    data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TTL_MS[type]) },
  });
  return raw;
}

/**
 * Validate and consume a token. Returns the userId on success (token is
 * deleted), or null if it's unknown, the wrong type, or expired.
 */
export async function consumeToken(
  raw: string,
  type: AuthTokenType,
): Promise<string | null> {
  if (!raw) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  if (!row || row.type !== type) return null;

  // Always remove it now — single use, even if expired (housekeeping).
  await db.authToken.delete({ where: { id: row.id } }).catch(() => {});
  if (row.expiresAt < new Date()) return null;
  return row.userId;
}
