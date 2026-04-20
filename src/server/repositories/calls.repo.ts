import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CallRow, CallStatus, Disposition } from "@/types/db";

export type CallFilters = {
  dispositionIn?: Disposition[] | null;
  statusIn?: CallStatus[] | null;
  leadId?: string | null;
  from?: string | null;      // ISO datetime
  to?: string | null;        // ISO datetime
  limit: number;
  offset: number;
};

export async function listCalls(
  workspaceId: string,
  filters: CallFilters,
): Promise<{ rows: CallRow[]; total: number }> {
  let q = supabaseAdmin()
    .from("calls")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (filters.leadId) q = q.eq("lead_id", filters.leadId);
  if (filters.dispositionIn?.length) q = q.in("disposition", filters.dispositionIn);
  if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as CallRow[], total: count ?? 0 };
}

export async function getCall(
  workspaceId: string,
  callId: string,
): Promise<CallRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("calls")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", callId)
    .maybeSingle();
  if (error) throw error;
  return data as CallRow | null;
}

export type CreateCallInput = {
  userId: string;
  leadId?: string | null;
  twilioCallSid?: string | null;
  from: string;
  to: string;
  direction?: "OUTBOUND" | "INBOUND";
  status?: CallStatus;
};

export async function createCall(
  workspaceId: string,
  input: CreateCallInput,
): Promise<CallRow> {
  const { data, error } = await supabaseAdmin()
    .from("calls")
    .insert({
      workspace_id: workspaceId,
      user_id: input.userId,
      lead_id: input.leadId ?? null,
      twilio_call_sid: input.twilioCallSid ?? null,
      from: input.from,
      to: input.to,
      direction: input.direction ?? "OUTBOUND",
      status: input.status ?? "QUEUED",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CallRow;
}

export type StatusCallbackPatch = {
  status?: CallStatus;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
  priceUsd?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

/**
 * Idempotent upsert keyed by `twilio_call_sid`. Webhooks can retry — we merge
 * the newest status into the existing row rather than creating duplicates.
 */
export async function upsertByTwilioSid(
  workspaceId: string,
  twilioCallSid: string,
  base: { userId?: string; from?: string; to?: string; leadId?: string | null },
  patch: StatusCallbackPatch,
): Promise<CallRow> {
  const { data, error } = await supabaseAdmin()
    .from("calls")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: base.userId,
        from: base.from,
        to: base.to,
        lead_id: base.leadId ?? null,
        twilio_call_sid: twilioCallSid,
        status: patch.status ?? undefined,
        started_at: patch.startedAt ?? undefined,
        answered_at: patch.answeredAt ?? undefined,
        ended_at: patch.endedAt ?? undefined,
        duration_sec: patch.durationSec ?? undefined,
        price_usd: patch.priceUsd ?? undefined,
        error_code: patch.errorCode ?? undefined,
        error_message: patch.errorMessage ?? undefined,
      },
      { onConflict: "twilio_call_sid", ignoreDuplicates: false },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as CallRow;
}

export async function setRecording(
  workspaceId: string,
  twilioCallSid: string,
  input: {
    recordingSid: string;
    recordingUrl: string;
    recordingDurationSec?: number | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("calls")
    .update({
      recording_sid: input.recordingSid,
      recording_url: input.recordingUrl,
      recording_duration_sec: input.recordingDurationSec ?? null,
    })
    .eq("workspace_id", workspaceId)
    .eq("twilio_call_sid", twilioCallSid);
  if (error) throw error;
}

export async function setAmdResult(
  workspaceId: string,
  twilioCallSid: string,
  amdResult: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("calls")
    .update({ amd_result: amdResult })
    .eq("workspace_id", workspaceId)
    .eq("twilio_call_sid", twilioCallSid);
  if (error) throw error;
}

export async function setDisposition(
  workspaceId: string,
  callId: string,
  disposition: Disposition,
): Promise<CallRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("calls")
    .update({ disposition })
    .eq("workspace_id", workspaceId)
    .eq("id", callId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as CallRow | null;
}

export async function updateNotes(
  workspaceId: string,
  callId: string,
  notes: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("calls")
    .update({ notes })
    .eq("workspace_id", workspaceId)
    .eq("id", callId);
  if (error) throw error;
}
