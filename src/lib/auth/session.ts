import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  type AccessTokenPayload,
} from "./jwt";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const REFRESH_COOKIE = "dialer_refresh";
// Path is `/` so the Edge proxy (`src/proxy.ts`) can read it for page-level
// redirects. Cookie stays httpOnly + Secure + SameSite=Lax so JS can't see it.
export const REFRESH_COOKIE_PATH = "/";

type IssueInput = AccessTokenPayload & {
  userAgent?: string | null;
  ip?: string | null;
};

export type IssuedSession = {
  accessToken: string;
  accessTokenTtlSec: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export async function issueSession(input: IssueInput): Promise<IssuedSession> {
  const accessToken = await signAccessToken({
    sub: input.sub,
    wid: input.wid,
    role: input.role,
  });
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    Date.now() + serverEnv.JWT_REFRESH_TTL_SEC * 1000,
  );

  const { error } = await supabaseAdmin()
    .from("sessions")
    .insert({
      user_id: input.sub,
      refresh_token_hash: refreshTokenHash,
      user_agent: input.userAgent ?? null,
      ip: input.ip ?? null,
      expires_at: refreshTokenExpiresAt.toISOString(),
    });
  if (error) throw error;

  return {
    accessToken,
    accessTokenTtlSec: serverEnv.JWT_ACCESS_TTL_SEC,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function setRefreshCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

export async function clearRefreshCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: new Date(0),
  });
}

export async function readRefreshCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value ?? null;
}

/**
 * Rotate a refresh token: find the session by hash, revoke it, issue a fresh
 * access token + refresh token, persist the new session. Returns null if the
 * refresh token is unknown, expired, or revoked.
 */
export async function rotateSession(
  oldRefreshToken: string,
  meta: { userAgent?: string | null; ip?: string | null },
): Promise<{
  userId: string;
  workspaceId: string;
  role: AccessTokenPayload["role"];
  session: IssuedSession;
} | null> {
  const hash = hashRefreshToken(oldRefreshToken);
  const db = supabaseAdmin();

  const { data: session } = await db
    .from("sessions")
    .select("id, user_id, expires_at, revoked_at")
    .eq("refresh_token_hash", hash)
    .maybeSingle();

  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: user, error: userErr } = await db
    .from("users")
    .select("id, workspace_id, role")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userErr || !user) return null;

  const { error: revokeErr } = await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", session.id);
  if (revokeErr) throw revokeErr;

  const issued = await issueSession({
    sub: user.id,
    wid: user.workspace_id,
    role: user.role,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return {
    userId: user.id,
    workspaceId: user.workspace_id,
    role: user.role,
    session: issued,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const hash = hashRefreshToken(token);
  await supabaseAdmin()
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("refresh_token_hash", hash)
    .is("revoked_at", null);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await supabaseAdmin()
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
}
