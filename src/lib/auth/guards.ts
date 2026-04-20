import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserRow, WorkspaceRow } from "@/types/db";

/**
 * Extract the access-token payload from the `Authorization: Bearer …` header
 * on an incoming request. Middleware may already have verified it and
 * forwarded `x-user-id` / `x-workspace-id` / `x-user-role`, in which case we
 * fast-path.
 */
export async function getAuthFromHeaders(): Promise<AccessTokenPayload | null> {
  const h = await headers();

  const uid = h.get("x-user-id");
  const wid = h.get("x-workspace-id");
  const role = h.get("x-user-role");
  if (uid && wid && role) {
    return { sub: uid, wid, role: role as AccessTokenPayload["role"] };
  }

  const auth = h.get("authorization") ?? h.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  return verifyAccessToken(token);
}

export type RequiredUser = {
  user: UserRow;
  workspace: WorkspaceRow;
};

export async function requireUser(): Promise<RequiredUser> {
  const payload = await getAuthFromHeaders();
  if (!payload) redirect("/login");

  const db = supabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("id", payload.sub)
    .maybeSingle();
  if (!user) redirect("/login");

  const { data: workspace } = await db
    .from("workspaces")
    .select("*")
    .eq("id", user.workspace_id)
    .maybeSingle();
  if (!workspace) redirect("/login");

  return { user, workspace };
}

export async function optionalUser(): Promise<RequiredUser | null> {
  const payload = await getAuthFromHeaders();
  if (!payload) return null;
  const db = supabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("id", payload.sub)
    .maybeSingle();
  if (!user) return null;
  const { data: workspace } = await db
    .from("workspaces")
    .select("*")
    .eq("id", user.workspace_id)
    .maybeSingle();
  if (!workspace) return null;
  return { user, workspace };
}
