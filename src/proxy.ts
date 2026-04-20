import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth/edge-jwt";

/**
 * Next 16 `proxy.ts` (replaces `middleware.ts`). Handles two concerns:
 *
 *  1. API route gating — verifies the `Authorization: Bearer …` access
 *     token, and forwards identity as `x-user-id` / `x-workspace-id` /
 *     `x-user-role` headers so downstream routes can skip re-verification.
 *     Twilio webhooks + /api/auth/* are allowlisted.
 *
 *  2. Page-level redirects based on the httpOnly refresh cookie:
 *     - Signed-in user landing on /login, /register, /forgot → /dashboard
 *     - Signed-out user landing on any authenticated page → /login
 *       (with `?next=<originalPath>` so we can bounce back after login)
 *
 *  The refresh cookie is only used as a *presence* signal here — the
 *  proxy runs on the Edge runtime and can't hit Postgres to validate the
 *  session. If the cookie is stale/revoked, `AuthGate` on the client will
 *  route the user correctly once the refresh call fails.
 */

const REFRESH_COOKIE = "dialer_refresh";

// API paths that don't require Bearer auth.
const PUBLIC_API = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/twilio\/voice(\/|$)/,
  /^\/api\/twilio\/status-callback$/,
  /^\/api\/twilio\/recording-callback$/,
  /^\/api\/twilio\/amd-callback$/,
];

// Pages inside the (app) route group — authentication required.
const AUTH_PAGE =
  /^\/(dashboard|dialer|leads|power-dialer|calls|meetings|sms|voicemails|analytics|settings)(\/|$)/;

// Landing pages that signed-in users should skip.
const GUEST_ONLY_PAGE = /^\/(login|register|forgot)(\/|$)/;

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- API routes ------------------------------------------------
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((rx) => rx.test(pathname))) {
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

  // ---- Page routes -----------------------------------------------
  const hasRefreshCookie = req.cookies.has(REFRESH_COOKIE);

  // Signed-in users landing on the marketing/login pages → dashboard
  if (hasRefreshCookie && GUEST_ONLY_PAGE.test(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Signed-out users landing on an app page → login, with ?next=<path>
  if (!hasRefreshCookie && AUTH_PAGE.test(pathname)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets + image files.
    "/((?!_next/|_static/|favicon\\.ico|icons\\/|manifest\\.webmanifest|sw\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?|mp3|wav)$).*)",
    "/(api|trpc)(.*)",
  ],
};
