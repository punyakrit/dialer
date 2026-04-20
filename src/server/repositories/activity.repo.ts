import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ActivityLogRow, ActivityType, Json } from "@/types/db";

export async function logActivity(
  workspaceId: string,
  input: {
    type: ActivityType;
    userId?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    payload?: Json | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("activity_logs")
    .insert({
      workspace_id: workspaceId,
      type: input.type,
      user_id: input.userId ?? null,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      payload: input.payload ?? null,
    });
  if (error) throw error;
}

export async function listActivityForTarget(
  workspaceId: string,
  targetType: string,
  targetId: string,
  limit = 50,
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("activity_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityLogRow[];
}

export async function listRecentActivity(
  workspaceId: string,
  limit = 30,
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("activity_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityLogRow[];
}
