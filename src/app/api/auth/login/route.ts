import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession, setRefreshCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const LoginBody = z.object({
  email: z.email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = LoginBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const db = supabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("id, email, name, role, workspace_id, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (!user || !user.password_hash) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const session = await issueSession({
    sub: user.id,
    wid: user.workspace_id,
    role: user.role,
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  });
  await setRefreshCookie(session.refreshToken, session.refreshTokenExpiresAt);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspaceId: user.workspace_id,
    accessToken: session.accessToken,
    accessTokenTtlSec: session.accessTokenTtlSec,
  });
}
