import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/client";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: string; // ISO string (JWT payloads must be JSON-serializable)
};

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Add it to your .env file.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ userId, role, expiresAt: expiresAt.toISOString() });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decrypt(token);
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
