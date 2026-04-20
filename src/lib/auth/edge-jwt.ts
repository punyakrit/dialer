/**
 * Edge-runtime-safe JWT verification. Only imports `jose`; no `node:crypto`.
 * Used by `src/middleware.ts` which runs on the Edge runtime.
 */
import { jwtVerify } from "jose";

export type AccessTokenPayload = {
  sub: string;
  wid: string;
  role: "OWNER" | "ADMIN" | "AGENT";
};

const ISSUER = "dialer-by-launchcraft";
const AUDIENCE = "dialer-app";

export async function verifyAccessTokenEdge(
  token: string,
  secret: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"],
      },
    );
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
      role: payload.role as AccessTokenPayload["role"],
    };
  } catch {
    return null;
  }
}
