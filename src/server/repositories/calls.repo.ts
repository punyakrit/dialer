import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CallRow, CallStatus, Database, Disposition } from "@/types/db";

type CallUpdate = Database["dialer"]["Tables"]["calls"]["Update"];

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

export type SeedOutboundCallInput = {
  userId: string;
  twilioCallSid: string;       // parent-leg SID from the TwiML voice webhook
  from: string;                // caller ID (the Twilio DID), not "client:user-…"
  to: string;                  // dialed E.164
  leadId?: string | null;
};

/**
 * Seed a minimal row at dial time so status-callbacks have something to update.
 * Required because `calls.user_id` is NOT NULL — the status-callback webhook
 * never has the user_id, so it cannot create the row itself.
 *
 * Idempotent: a duplicate twilio_call_sid is a no-op.
 */
export async function seedOutboundCall(
  workspaceId: string,
  input: SeedOutboundCallInput,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("calls")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: input.userId,
        twilio_call_sid: input.twilioCallSid,
        from: input.from,
        to: input.to,
        lead_id: input.leadId ?? null,
        direction: "OUTBOUND",
        status: "INITIATED",
      },
      { onConflict: "twilio_call_sid", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/**
 * Status-callback writer: patches an existing row by `twilio_call_sid`.
 * Never creates a row — if the seed is missing, returns null so the caller
 * can log a warning without erroring the webhook.
 */
export async function updateCallStatusByTwilioSid(
  workspaceId: string,
  twilioCallSid: string,
  patch: StatusCallbackPatch,
): Promise<CallRow | null> {
  const update: CallUpdate = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.startedAt) update.started_at = patch.startedAt;
  if (patch.answeredAt) update.answered_at = patch.answeredAt;
  if (patch.endedAt) update.ended_at = patch.endedAt;
  if (patch.durationSec != null) update.duration_sec = patch.durationSec;
  if (patch.priceUsd != null) update.price_usd = patch.priceUsd;
  if (patch.errorCode != null) update.error_code = patch.errorCode;
  if (patch.errorMessage != null) update.error_message = patch.errorMessage;

  if (Object.keys(update).length === 0) {
    return null;
  }

  const { data, error } = await supabaseAdmin()
    .from("calls")
    .update(update)
    .eq("workspace_id", workspaceId)
    .eq("twilio_call_sid", twilioCallSid)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as CallRow | null;
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
