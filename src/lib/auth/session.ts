import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_SECONDS } from "./policy";

export type SessionClaims = { userId: string; sessionVersion: number; activeBranchId?: string; roles: string[] };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function createSession(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_TTL_SECONDS}s`).sign(secret());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secret());
  if (typeof payload.userId !== "string" || typeof payload.sessionVersion !== "number" || !Array.isArray(payload.roles)) {
    throw new Error("Invalid session claims");
  }
  return payload as unknown as SessionClaims;
}
