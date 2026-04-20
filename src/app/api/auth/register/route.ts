import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";
import { issueSession, setRefreshCookie } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const RegisterBody = z.object({
  email: z.email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(200).optional(),
  workspaceName: z.string().trim().min(1).max(200).optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = RegisterBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const { email, password, name, workspaceName } = parsed.data;

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const wsName =
    workspaceName?.trim() ||
    (name ? `${name}'s workspace` : "My workspace");
  const baseSlug = slugify(wsName) || "workspace";
  const slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;

  const { data: workspace, error: wsErr } = await db
    .from("workspaces")
    .insert({ name: wsName, slug })
    .select("id, name, slug, timezone, created_at, updated_at")
    .single();
  if (wsErr || !workspace) {
    logger.error("register: failed to create workspace", {
      err: wsErr?.message,
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const passwordHash = await hashPassword(password);
  const { data: user, error: userErr } = await db
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      name: name ?? null,
      workspace_id: workspace.id,
      role: "OWNER",
    })
    .select("id, email, name, role, workspace_id")
    .single();
  if (userErr || !user) {
    await db.from("workspaces").delete().eq("id", workspace.id);
    logger.error("register: failed to create user", { err: userErr?.message });
    return NextResponse.json({ error: "internal" }, { status: 500 });
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
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    accessToken: session.accessToken,
    accessTokenTtlSec: session.accessTokenTtlSec,
  });
}
