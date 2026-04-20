import { NextResponse, type NextRequest } from "next/server";
import {
  clearRefreshCookie,
  readRefreshCookie,
  rotateSession,
  setRefreshCookie,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const oldToken = await readRefreshCookie();
  if (!oldToken) {
    return NextResponse.json({ error: "no_refresh_cookie" }, { status: 401 });
  }

  const rotated = await rotateSession(oldToken, {
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  });
  if (!rotated) {
    await clearRefreshCookie();
    return NextResponse.json({ error: "invalid_refresh" }, { status: 401 });
  }

  await setRefreshCookie(
    rotated.session.refreshToken,
    rotated.session.refreshTokenExpiresAt,
  );

  return NextResponse.json({
    accessToken: rotated.session.accessToken,
    accessTokenTtlSec: rotated.session.accessTokenTtlSec,
    userId: rotated.userId,
    workspaceId: rotated.workspaceId,
    role: rotated.role,
  });
}
