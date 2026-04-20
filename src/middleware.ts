import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth/edge-jwt";

export const config = {
  matcher: ["/api/:path*"],
};

/**
 * Paths that do not require a verified JWT:
 *   - /api/auth/*                 — the auth routes themselves
 *   - /api/twilio/voice/*         — Twilio webhooks (signature-validated)
 *   - /api/twilio/status-callback
 *   - /api/twilio/recording-callback
 *   - /api/twilio/amd-callback
 */
const PUBLIC_PATHS = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/twilio\/voice(\/|$)/,
  /^\/api\/twilio\/status-callback$/,
  /^\/api\/twilio\/recording-callback$/,
  /^\/api\/twilio\/amd-callback$/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((rx) => rx.test(pathname))) {
    return NextResponse.next();
  }

  const auth =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 },
    );
  }

  const payload = await verifyAccessTokenEdge(token, secret);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id", payload.sub);
  headers.set("x-workspace-id", payload.wid);
  headers.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers } });
}
