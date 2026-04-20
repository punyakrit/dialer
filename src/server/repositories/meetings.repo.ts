import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MeetingRow, MeetingStatus } from "@/types/db";

export async function listMeetings(
  workspaceId: string,
  opts: { from?: string; to?: string; limit: number; offset: number },
): Promise<{ rows: MeetingRow[]; total: number }> {
  let q = supabaseAdmin()
    .from("meetings")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);
  if (opts.from) q = q.gte("starts_at", opts.from);
  if (opts.to) q = q.lte("starts_at", opts.to);
  const { data, error, count } = await q
    .order("starts_at", { ascending: true })
    .range(opts.offset, opts.offset + opts.limit - 1);
  if (error) throw error;
  return { rows: (data ?? []) as MeetingRow[], total: count ?? 0 };
}

export type CreateMeetingInput = {
  leadId: string;
  organizerId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  email?: string | null;
  notes?: string | null;
};

export async function createMeeting(
  workspaceId: string,
  input: CreateMeetingInput,
): Promise<MeetingRow> {
  const { data, error } = await supabaseAdmin()
    .from("meetings")
    .insert({
      workspace_id: workspaceId,
      lead_id: input.leadId,
      organizer_id: input.organizerId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      email: input.email ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MeetingRow;
}

export async function updateMeeting(
  workspaceId: string,
  meetingId: string,
  patch: Partial<
    Pick<
      MeetingRow,
      "title" | "starts_at" | "ends_at" | "email" | "notes" | "status"
    >
  >,
): Promise<MeetingRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("meetings")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", meetingId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as MeetingRow | null;
}

export async function setMeetingStatus(
  workspaceId: string,
  meetingId: string,
  status: MeetingStatus,
): Promise<void> {
  await supabaseAdmin()
    .from("meetings")
    .update({ status })
    .eq("workspace_id", workspaceId)
    .eq("id", meetingId);
}

export async function deleteMeeting(
  workspaceId: string,
  meetingId: string,
): Promise<boolean> {
  const { error, count } = await supabaseAdmin()
    .from("meetings")
    .delete({ count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("id", meetingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
