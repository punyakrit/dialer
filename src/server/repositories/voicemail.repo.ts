import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VoicemailDropRow } from "@/types/db";

export async function listVoicemailDrops(
  workspaceId: string,
): Promise<VoicemailDropRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("voicemail_drops")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VoicemailDropRow[];
}

export async function getVoicemailDrop(
  workspaceId: string,
  dropId: string,
): Promise<VoicemailDropRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("voicemail_drops")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", dropId)
    .maybeSingle();
  if (error) throw error;
  return data as VoicemailDropRow | null;
}

export async function createVoicemailDrop(
  workspaceId: string,
  input: { name: string; storagePath: string; durationSec?: number | null },
): Promise<VoicemailDropRow> {
  const { data, error } = await supabaseAdmin()
    .from("voicemail_drops")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      storage_path: input.storagePath,
      duration_sec: input.durationSec ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VoicemailDropRow;
}

export async function deleteVoicemailDrop(
  workspaceId: string,
  dropId: string,
): Promise<boolean> {
  const { error, count } = await supabaseAdmin()
    .from("voicemail_drops")
    .delete({ count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("id", dropId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
