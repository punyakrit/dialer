import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { UserRole } from "@/types/db";

export type AccessTokenPayload = {
  sub: string; // user id
  wid: string; // workspace id
  role: UserRole;
};

const ISSUER = "dialer-by-launchcraft";
const AUDIENCE = "dialer-app";

function accessKey() {
  return new TextEncoder().encode(serverEnv.JWT_ACCESS_SECRET);
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + serverEnv.JWT_ACCESS_TTL_SEC)
    .sign(accessKey());
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.wid !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      wid: payload.wid as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

/* Refresh tokens are opaque random bytes; only their sha256 hash is stored. */

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const JWT_ISSUER = ISSUER;
export const JWT_AUDIENCE = AUDIENCE;
